import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import settings


class EmailService:

    def send_otp_email(self, to_email: str, otp: str):
        try:
            subject = "OTP Verification"

            body = f"""
Your OTP is: {otp}
This code will expire in 5 minutes.
"""

            message = MIMEMultipart()
            message["From"] = settings.EMAIL_USER
            message["To"] = to_email
            message["Subject"] = subject
            message.attach(MIMEText(body, "plain"))

            print("📧 Sending email to:", to_email)

            server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
            server.starttls()

            print("🔐 Logging in Gmail...")
            server.login(settings.EMAIL_USER, settings.EMAIL_PASSWORD)

            print("📤 Sending message...")
            server.send_message(message)

            print("✅ Email sent successfully!")

            server.quit()

        except Exception as e:
            print("❌ EMAIL ERROR:", str(e))
            raise

    def send_reset_password_email(self, to_email: str, token: str):
        subject = "Reset Password"

        link = f"http://localhost:8000/reset-password?token={token}"

        body = f"""
    Click the link below to reset your password:

    {link}

    This link will expire in 15 minutes.
    """

        message = MIMEMultipart()
        message["From"] = settings.EMAIL_USER
        message["To"] = to_email
        message["Subject"] = subject
        message.attach(MIMEText(body, "plain"))

        try:
            server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
            server.starttls()
            server.login(settings.EMAIL_USER, settings.EMAIL_PASSWORD)
            server.send_message(message)
            server.quit()
        except Exception as e:
            print("❌ Reset email error:", e)