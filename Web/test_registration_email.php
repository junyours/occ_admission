<?php

declare(strict_types=1);

/**
 * Run beside artisan in the Laravel Web project:
 *   php test_registration_email.php
 *   php test_registration_email.php you@example.com --send
 *
 * Default: exercise startRegistration() with fake mail and an in-memory DB.
 * --send: also send the captured registration email through the active SMTP
 * transport. No real student account or registration code is saved.
 * --email-only: test just the mailable/SMTP when pdo_sqlite is unavailable.
 * --project=PATH: use a Laravel project elsewhere instead of this directory.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

function registrationEmailTestHelp(): void
{
    echo <<<'HELP'
Registration email test (run from the Laravel directory containing artisan)

  php test_registration_email.php
      Check the real registration method and email template. No email sent.

  php test_registration_email.php you@example.com --send
      Perform the checks, then send ONE test email to that explicit address.

  php test_registration_email.php you@example.com --email-only --send
      Test the email template/SMTP only (does not require SQLite).

Optional: --project=PATH points to a different Laravel project directory.

Registration checks use only an in-memory database/cache/session. The test
email has a [TEST] subject, and its code cannot verify a real account.
SMTP acceptance does not prove delivery to the recipient's inbox.

HELP;
}

$send = false;
$emailOnly = false;
$recipient = null;
$project = __DIR__;

foreach (array_slice($argv, 1) as $argument) {
    if (in_array($argument, ['--help', '-h'], true)) {
        registrationEmailTestHelp();
        exit(0);
    }

    if ($argument === '--send') {
        $send = true;
    } elseif ($argument === '--email-only') {
        $emailOnly = true;
    } elseif (str_starts_with($argument, '--project=')) {
        $project = substr($argument, strlen('--project='));
    } elseif (str_starts_with($argument, '-') || $recipient !== null) {
        fwrite(STDERR, "[FAIL] Unknown or extra argument. Use --help.\n");
        exit(2);
    } else {
        $recipient = $argument;
    }
}

if (($send && $recipient === null)
    || ($recipient !== null && !filter_var($recipient, FILTER_VALIDATE_EMAIL))) {
    fwrite(STDERR, "[FAIL] --send requires an explicit valid recipient email.\n");
    exit(2);
}

$recipient = strtolower($recipient ?? 'registration-email-test@example.test');
$temporaryDirectory = null;
$secrets = [];
$exitCode = 1;

// Only remove files created inside this script's unique temporary directory.
register_shutdown_function(static function () use (&$temporaryDirectory): void {
    if ($temporaryDirectory === null || !is_dir($temporaryDirectory)) {
        return;
    }

    foreach (new DirectoryIterator($temporaryDirectory) as $file) {
        if ($file->isFile() && !$file->isLink()) {
            @unlink($file->getPathname());
        }
    }
    @rmdir($temporaryDirectory);
});

function registrationEmailTestFailureMessage(Throwable $exception, array $secrets): string
{
    $message = $exception->getMessage();
    // SMTP errors may contain transport URLs, passwords, or auth challenges.
    usort($secrets, static fn ($left, $right) => strlen($right) <=> strlen($left));
    foreach ($secrets as $secret) {
        if ($secret !== '') {
            $message = str_replace($secret, '[redacted]', $message);
        }
    }
    $message = preg_replace('~\b(?:smtp|smtps)://[^\s]+~i', '[SMTP URL redacted]', $message);
    $message = preg_replace('/\b[A-Za-z0-9+\/=_-]{48,}\b/', '[token redacted]', $message);

    return substr((string) preg_replace('/[\r\n]+/', ' ', $message), 0, 1200);
}

try {
    if (!is_file($project.'/vendor/autoload.php') || !is_file($project.'/bootstrap/app.php')) {
        throw new RuntimeException('Place this file beside artisan, or pass --project=PATH to the Laravel Web project.');
    }
    if (!$emailOnly && !extension_loaded('pdo_sqlite')) {
        throw new RuntimeException('pdo_sqlite is required for isolated registration checks. Enable it, or use --email-only to test SMTP separately.');
    }

    require $project.'/vendor/autoload.php';
    $app = require $project.'/bootstrap/app.php';
    $app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

    $mailerName = (string) config('mail.default');
    $mailerConfig = (array) config('mail.mailers.'.$mailerName, []);
    $transport = (string) ($mailerConfig['transport'] ?? 'unknown');
    foreach (['username', 'password', 'url'] as $secretKey) {
        $secret = (string) ($mailerConfig[$secretKey] ?? '');
        if ($secret !== '') {
            $secrets[] = $secret;
            $secrets[] = base64_encode($secret);
        }
    }
    $transportUrl = (string) ($mailerConfig['url'] ?? '');
    $urlParts = $transportUrl !== '' ? @parse_url($transportUrl) : [];
    if (is_array($urlParts)) {
        foreach (['user', 'pass'] as $credentialPart) {
            if (isset($urlParts[$credentialPart])) {
                $credential = rawurldecode($urlParts[$credentialPart]);
                $secrets[] = $credential;
                $secrets[] = rawurlencode($credential);
                $secrets[] = base64_encode($credential);
            }
        }
    }

    echo "Registration email test\n";
    echo 'Environment: '.$app->environment()."\n";
    echo 'Configuration cached: '.($app->configurationIsCached() ? 'yes' : 'no')."\n";
    echo "Active mailer: {$mailerName}; transport: {$transport}\n";
    echo 'Mode: '.($send ? 'ONE REAL TEST EMAIL' : 'DRY RUN - no email will be sent')."\n";

    if ($send && $transport !== 'smtp') {
        throw new RuntimeException('The active transport is not SMTP. Check MAIL_MAILER and the active/cached mail configuration before testing delivery.');
    }

    $temporaryDirectory = sys_get_temp_dir().DIRECTORY_SEPARATOR.'occ-registration-mail-'.bin2hex(random_bytes(8));
    if (!mkdir($temporaryDirectory, 0700)) {
        throw new RuntimeException('Could not create the temporary test directory.');
    }

    // Configuration changes affect only this CLI process, never .env or config cache.
    config([
        'cache.default' => 'array',
        'cache.stores.array' => ['driver' => 'array', 'serialize' => false],
        'session.driver' => 'array',
        'logging.default' => 'registration_email_test',
        'logging.channels.registration_email_test' => [
            'driver' => 'monolog',
            'handler' => \Monolog\Handler\NullHandler::class,
        ],
        'view.compiled' => $temporaryDirectory,
    ]);
    \Illuminate\Support\Facades\Log::forgetChannel();
    // Providers can resolve Blade while booting, before the temporary path is set.
    foreach (['view', 'view.engine.resolver', 'blade.compiler'] as $viewService) {
        $app->forgetInstance($viewService);
    }
    \Illuminate\Support\Facades\View::clearResolvedInstance('view');
    \Illuminate\Support\Facades\Blade::clearResolvedInstance('blade.compiler');

    $name = 'Registration Email Test';
    $mailManager = $app->make('mail.manager');

    if ($emailOnly) {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $mail = new \App\Mail\RegistrationVerificationCode($code, $name);
        $mail->to($recipient);
        echo "[SKIP] Registration method not executed (--email-only).\n";
    } else {
        // Use a dedicated connection name and no application migrations.
        config([
            'database.default' => 'registration_email_test',
            'database.connections.registration_email_test' => [
                'driver' => 'sqlite',
                'database' => ':memory:',
                'prefix' => '',
                'foreign_key_constraints' => true,
            ],
        ]);
        \Illuminate\Support\Facades\DB::setDefaultConnection('registration_email_test');
        $schema = \Illuminate\Support\Facades\DB::connection('registration_email_test')->getSchemaBuilder();
        $schema->create('users', static function (\Illuminate\Database\Schema\Blueprint $table): void {
            $table->id();
            $table->string('username');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('role');
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamps();
        });
        $schema->create('exam_registration_settings', static function (\Illuminate\Database\Schema\Blueprint $table): void {
            $table->id();
            $table->boolean('registration_open');
        });
        \Illuminate\Support\Facades\DB::table('exam_registration_settings')->insert(['registration_open' => true]);

        $profilePath = $temporaryDirectory.DIRECTORY_SEPARATOR.'profile.png';
        file_put_contents($profilePath, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOioAAAAASUVORK5CYII=', true));
        $request = \Illuminate\Http\Request::create('/register/start', 'POST', [
            'lname' => 'Test', 'fname' => 'Registration', 'mname' => 'Email',
            'email' => $recipient,
            'password' => 'Registration-Test-'.bin2hex(random_bytes(8)),
            'gender' => 'Male', 'age' => 18,
            'school_name' => 'Email Test School',
            'parent_name' => 'Test Guardian', 'parent_phone' => '09123456789',
            'phone' => '09123456789', 'address' => 'Email test only',
            'selected_exam_date' => now()->addDay()->toDateString(),
            'selected_exam_session' => 'morning',
            'preferred_course_1' => 'Test Course 1',
            'preferred_course_2' => 'Test Course 2',
            'preferred_course_3' => 'Test Course 3',
        ], [], [
            'profile' => new \Illuminate\Http\UploadedFile($profilePath, 'profile.png', 'image/png', null, true),
        ]);
        $request->merge(['password_confirmation' => $request->input('password')]);
        $session = $app->make('session')->driver('array');
        $session->start();
        $request->setLaravelSession($session);
        $app->instance('request', $request);
        $app->make('url')->setRequest($request);

        $fakeMail = \Illuminate\Support\Facades\Mail::fake();
        try {
            $response = $app->make(\App\Http\Controllers\Auth\AuthController::class)->startRegistration($request);
            $pending = \Illuminate\Support\Facades\Cache::get('reg:pending:'.sha1($recipient));
            $mails = $fakeMail->sent(\App\Mail\RegistrationVerificationCode::class);
            if ($mails->count() !== 1) {
                throw new RuntimeException('Registration did not send exactly one RegistrationVerificationCode email. Check the deployed startRegistration() method.');
            }
            $mail = $mails->first();
            if (!$mail->hasTo($recipient) || $mail->userName !== $name
                || !is_array($pending) || !preg_match('/^\d{6}$/D', (string) ($pending['code'] ?? ''))
                || $mail->verificationCode !== $pending['code']) {
                throw new RuntimeException('The registration email recipient, name, or code does not match the pending registration.');
            }
            if (!$response instanceof \Illuminate\Http\RedirectResponse
                || parse_url($response->getTargetUrl(), PHP_URL_PATH) !== '/register/verify') {
                throw new RuntimeException('Registration did not redirect to the verification-code screen.');
            }
            echo "[PASS] Real startRegistration() method created the correct verification email.\n";
            echo "[PASS] Recipient, six-digit cached code, and verification redirect match.\n";
            echo "[PASS] Database, cache, and session used only in-memory test storage.\n";
        } finally {
            \Illuminate\Support\Facades\Mail::swap($mailManager);
        }
    }

    $html = $mail->render();
    if (!str_contains($html, (string) $mail->verificationCode)) {
        throw new RuntimeException('The rendered email does not contain the verification code.');
    }
    echo "[PASS] Registration email template renders and contains the code.\n";

    if (!$send) {
        echo "[PASS] Dry run complete. No email was sent.\n";
        echo "To test SMTP: php test_registration_email.php your-real-inbox@example.com --send\n";
        $exitCode = 0;
    } else {
        // Mark the message as a test after the mailable has populated its subject.
        $mail->withSymfonyMessage(static function (\Symfony\Component\Mime\Email $message): void {
            $message->subject('[TEST] '.$message->getSubject());
        });
        // Bound network waits apply only to this test process.
        if (($mailerConfig['timeout'] ?? null) === null) {
            config(['mail.mailers.'.$mailerName.'.timeout' => 30]);
            $mailManager->purge($mailerName);
        }
        $realMailer = $mailManager->mailer($mailerName);
        if (!$realMailer->getSymfonyTransport() instanceof \Symfony\Component\Mailer\Transport\Smtp\SmtpTransport) {
            throw new RuntimeException('The resolved mail transport is not SMTP. Check MAIL_URL and the active/cached mail configuration.');
        }
        // Validate the final To/Cc/Bcc after global mail routing and before SMTP.
        \Illuminate\Support\Facades\Event::listen(
            \Illuminate\Mail\Events\MessageSending::class,
            static function (\Illuminate\Mail\Events\MessageSending $event) use ($recipient): void {
                $addresses = array_merge($event->message->getTo(), $event->message->getCc(), $event->message->getBcc());
                $finalRecipients = array_map(static fn ($address) => strtolower($address->getAddress()), $addresses);
                if ($finalRecipients !== [$recipient]) {
                    throw new RuntimeException('Email not sent: a mail routing override changed the explicit test recipient.');
                }
            }
        );
        $sent = $realMailer->send($mail);
        if ($sent === null) {
            throw new RuntimeException('Email sending was cancelled. No SMTP acceptance was reported; check MessageSending event listeners.');
        }
        $actualRecipients = array_map(
            static fn ($address) => strtolower($address->getAddress()),
            $sent->getEnvelope()->getRecipients()
        );
        if ($actualRecipients !== [$recipient]) {
            throw new RuntimeException('The SMTP envelope recipient was overridden. Check Mail::alwaysTo or other mail routing configuration.');
        }
        echo "[PASS] SMTP accepted the registration test email.\n";
        echo "Check your inbox/spam for a subject beginning [TEST].\n";
        echo "This test code cannot verify a real account. Inbox delivery is not confirmed by SMTP acceptance.\n";
        $exitCode = 0;
    }
} catch (Throwable $exception) {
    fwrite(STDERR, '[FAIL] '.get_class($exception).': '.registrationEmailTestFailureMessage($exception, $secrets)."\n");
    if ($exception instanceof \Illuminate\Validation\ValidationException) {
        foreach ($exception->errors() as $field => $errors) {
            fwrite(STDERR, '[VALIDATION] '.$field.': '.implode(' ', $errors)."\n");
        }
    }
}

exit($exitCode);
