<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>OCC Admission - Confirm New Device Login</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f3f4f6; padding: 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <tr>
            <td style="background-color: #0a0a1a; padding: 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Confirm Your Login</h1>
            </td>
        </tr>
        <tr>
            <td style="padding: 24px;">
                <p style="color: #111827; font-size: 15px; margin-bottom: 16px;">
                    Hi {{ $recipientName }},
                </p>
                <p style="color: #374151; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                    We detected a login attempt to your OCC Admission account from a new device. If this was you, enter the verification code below in the mobile app to log out your other session and continue on this device.
                </p>
                <p style="text-align: center; margin: 24px 0;">
                    <span style="display: inline-block; font-size: 32px; letter-spacing: 8px; font-weight: 700; color: #0a0a1a;">
                        {{ $otpCode }}
                    </span>
                </p>
                <p style="color: #6b7280; font-size: 13px; text-align: center; margin-bottom: 24px;">
                    This code expires in 10 minutes. If you didn’t request this, please ignore this email.
                </p>
                <p style="color: #374151; font-size: 14px; margin-bottom: 0;">
                    Stay safe,<br>
                    <strong>OCC Guidance & Admission Team</strong>
                </p>
            </td>
        </tr>
    </table>
</body>
</html>

