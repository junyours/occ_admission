<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Code - OCC Admission System</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            padding: 30px;
            text-align: center;
            color: white;
        }
        .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            background-color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }
        .logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        .content {
            padding: 40px 30px;
        }
        .code-container {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%);
            border: 2px solid #3b82f6;
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
        }
        .reset-code {
            font-size: 48px;
            font-weight: bold;
            color: #1e40af;
            letter-spacing: 8px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
        }
        .warning {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            color: #92400e;
        }
        .footer {
            background-color: #f8fafc;
            padding: 20px 30px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
        }
        .expiry-info {
            background-color: #f0fdf4;
            border: 1px solid #22c55e;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            color: #166534;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            {{-- <div class="logo">
                <img src="data:image/png;base64,{{ base64_encode(file_get_contents(public_path('OCC logo.png'))) }}" alt="OCC Logo">
            </div> --}}
            <h1 style="margin: 0; font-size: 24px;">OCC Admission System</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Password Reset Request</p>
        </div>

        <div class="content">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Hello {{ $userName }},</h2>
            
            <p>We received a request to reset your password for your OCC Admission System account. To proceed with the password reset, please use the following 6-digit verification code:</p>

            <div class="code-container">
                <h3 style="margin: 0 0 15px; color: #374151;">Your Reset Code</h3>
                <div class="reset-code">{{ $resetCode }}</div>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Enter this code on the password reset page</p>
            </div>

            <div class="expiry-info">
                <strong>⚠️ Important:</strong> This code will expire in <strong>15 minutes</strong> for security reasons.
            </div>

            <div class="warning">
                <strong>🔒 Security Notice:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Never share this code with anyone</li>
                    <li>OCC staff will never ask for this code</li>
                    <li>If you didn't request this reset, please ignore this email</li>
                </ul>
            </div>

            <p>If you have any questions or need assistance, please contact our support team.</p>

            <p style="margin-top: 30px;">
                Best regards,<br>
                <strong>OCC Admission System Team</strong>
            </p>
        </div>

        <div class="footer">
            <p style="margin: 0;">
                © 2025 Opol Community College. All rights reserved.<br>
                This is an automated message, please do not reply to this email.
            </p>
        </div>
    </div>
</body>
</html>
