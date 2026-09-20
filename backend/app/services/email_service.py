import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings


class EmailService:
    @staticmethod
    def send_email(to_email: str, subject: str, html_content: str) -> None:
        """Send email using chosen backend ('console' or 'smtp')."""
        if settings.EMAIL_BACKEND == "console":
            print("\n" + "=" * 60)
            print(f"📧 [EMAIL CONSOLE BACKEND] To: {to_email}")
            print(f"Subject: {subject}")
            print("-" * 60)
            print(html_content)
            print("=" * 60 + "\n")
            return

        # SMTP Backend
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.EMAIL_FROM
            msg["To"] = to_email

            part = MIMEText(html_content, "html")
            msg.attach(part)

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if settings.SMTP_TLS:
                    server.starttls()
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.EMAIL_FROM, [to_email], msg.as_string())
        except Exception as e:
            print(f"⚠️ Failed to send SMTP email to {to_email}: {str(e)}")

    @classmethod
    def send_verification_email(cls, to_email: str, token: str) -> None:
        verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        subject = "Verify your email address - LifeSync AI"
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 24px;">
                <div style="max-width: 500px; margin: 0 auto; background-color: #18181b; padding: 32px; border-radius: 16px; border: 1px solid #27272a;">
                    <h2 style="color: #ffffff; margin-top: 0;">Welcome to LifeSync AI</h2>
                    <p style="color: #a1a1aa; font-size: 15px;">Please confirm your email address by clicking the button below. This link will expire in 24 hours.</p>
                    <div style="margin: 28px 0; text-align: center;">
                        <a href="{verify_url}" style="background-color: #3b82f6; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Verify Email Address</a>
                    </div>
                    <p style="color: #71717a; font-size: 13px;">If you did not create a LifeSync AI account, you can safely ignore this email.</p>
                </div>
            </body>
        </html>
        """
        cls.send_email(to_email, subject, html)

    @classmethod
    def send_already_registered_email(cls, to_email: str) -> None:
        login_url = f"{settings.FRONTEND_URL}/login"
        reset_url = f"{settings.FRONTEND_URL}/forgot-password"
        subject = "Account attempt notice - LifeSync AI"
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 24px;">
                <div style="max-width: 500px; margin: 0 auto; background-color: #18181b; padding: 32px; border-radius: 16px; border: 1px solid #27272a;">
                    <h2 style="color: #ffffff; margin-top: 0;">Account Notice</h2>
                    <p style="color: #a1a1aa; font-size: 15px;">Someone attempted to register a LifeSync AI account using your email address, but you already have an account with us.</p>
                    <p style="color: #a1a1aa; font-size: 15px;">If this was you, you can log in directly or reset your password.</p>
                    <div style="margin: 28px 0; text-align: center;">
                        <a href="{login_url}" style="background-color: #3b82f6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-right: 8px;">Log In</a>
                        <a href="{reset_url}" style="background-color: #27272a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Forgot Password</a>
                    </div>
                </div>
            </body>
        </html>
        """
        cls.send_email(to_email, subject, html)

    @classmethod
    def send_password_reset_email(cls, to_email: str, token: str) -> None:
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        subject = "Reset your password - LifeSync AI"
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 24px;">
                <div style="max-width: 500px; margin: 0 auto; background-color: #18181b; padding: 32px; border-radius: 16px; border: 1px solid #27272a;">
                    <h2 style="color: #ffffff; margin-top: 0;">Password Reset Request</h2>
                    <p style="color: #a1a1aa; font-size: 15px;">We received a request to reset your password. Click the button below to choose a new password. This link will expire in 30 minutes.</p>
                    <div style="margin: 28px 0; text-align: center;">
                        <a href="{reset_url}" style="background-color: #ef4444; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
                    </div>
                    <p style="color: #71717a; font-size: 13px;">If you did not request a password reset, please ignore this email or secure your account.</p>
                </div>
            </body>
        </html>
        """
        cls.send_email(to_email, subject, html)

    @classmethod
    def send_password_changed_email(cls, to_email: str) -> None:
        subject = "Security Notice: Password Changed - LifeSync AI"
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 24px;">
                <div style="max-width: 500px; margin: 0 auto; background-color: #18181b; padding: 32px; border-radius: 16px; border: 1px solid #27272a;">
                    <h2 style="color: #ffffff; margin-top: 0;">Password Updated</h2>
                    <p style="color: #a1a1aa; font-size: 15px;">Your LifeSync AI account password was successfully changed. All other active login sessions have been revoked for your security.</p>
                    <p style="color: #71717a; font-size: 13px;">If you did not perform this change, please contact support immediately.</p>
                </div>
            </body>
        </html>
        """
        cls.send_email(to_email, subject, html)
