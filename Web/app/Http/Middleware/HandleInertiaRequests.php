<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
                'info' => fn () => $request->session()->get('info'),
            ],
            'auth' => [
                'user' => fn () => $request->user() ? [
                    'id' => $request->user()->id,
                    'name' => $request->user()->name,
                    'email' => $request->user()->email,
                    'role' => $request->user()->role,
                    'username' => $request->user()->username,
                ] : null,
            ],
            'routes' => [
                'evaluator.dashboard' => route('evaluator.dashboard'),
                'evaluator.profile' => route('evaluator.profile'),
                'evaluator.profile.update' => route('evaluator.profile.update'),
                'evaluator.profile.password' => route('evaluator.profile.password'),
                'evaluator.department-exams' => route('evaluator.department-exams'),
                'evaluator.question-bank' => route('evaluator.question-bank'),
                'evaluator.question-import' => route('evaluator.question-import'),
                'evaluator.question-import.store' => route('evaluator.question-import.store'),
                'evaluator.question-import.template' => route('evaluator.question-import.template'),
                'evaluator.exam-results' => route('evaluator.exam-results'),
                'evaluator.student-results' => route('evaluator.student-results'),
                'guidance.dashboard' => route('guidance.dashboard'),
                'login' => route('login'),
                'logout' => route('logout'),
            ],
        ];
    }
}
