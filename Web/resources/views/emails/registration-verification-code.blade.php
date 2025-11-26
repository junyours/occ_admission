<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification Code - OCC Admission System</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); padding: 30px; text-align: center; color: white; }
        .content { padding: 40px 30px; }
        .code-container { background: linear-gradient(135deg, #ecfeff 0%, #eff6ff 100%); border: 2px solid #10b981; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
        .code { font-size: 42px; font-weight: bold; color: #065f46; letter-spacing: 8px; margin: 10px 0; font-family: 'Courier New', monospace; }
        .info { background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 15px; margin: 20px 0; color: #166534; }
        .footer { background-color: #f8fafc; padding: 20px 30px; text-align: center; color: #64748b; font-size: 14px; }
    </style>
    </head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin:0; font-size:24px;">OCC Admission System</h1>
            <p style="margin:10px 0 0; opacity:.9;">Verify Your Email Address</p>
        </div>
        <div class="content">
            <h2 style="color:#1f2937; margin-bottom: 12px;">Greetings!</h2>
            <p>Thank you for registering. To complete your registration, please enter the verification code below on the website.</p>
            <div class="code-container">
                <div class="code">{{ $verificationCode }}</div>
                <p style="margin:0; color:#374151;">This code is valid for up to 1 hour.</p>
            </div>
            <div class="info">
                <strong>Note:</strong> For your security, do not share this code with anyone.
            </div>
            <p>If you did not initiate this request, you can safely ignore this email.</p>
            <p style="margin-top: 24px;">Best regards,<br><strong>OCC Admission System Team</strong></p>
        </div>
        <div class="footer">
            <p style="margin:0;">© 2025 Opol Community College. All rights reserved.</p>
        </div>
    </div>
</body>
</html>


