import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from ..config import settings

def send_otp_email(recipient: str, otp_code: str) -> bool:
    """
    Sends a real 6-digit OTP verification email to the authorized superadmin.
    Supports Gmail SMTP (smtp.gmail.com:587) or any standard SMTP provider.
    """
    smtp_user = getattr(settings, "SMTP_USER", None) or ""
    smtp_pass = getattr(settings, "SMTP_PASSWORD", None) or ""
    smtp_host = getattr(settings, "SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(getattr(settings, "SMTP_PORT", 587))
    smtp_from = getattr(settings, "SMTP_FROM", None) or smtp_user or "Universal Attendance <noreply@attendance.system>"

    if not smtp_user or not smtp_pass:
        print(f"[EMAIL DEV MODE] SMTP not configured. OTP for {recipient} is: {otp_code}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"🔐 Your Superadmin Security Code: {otp_code}"
        msg["From"] = smtp_from
        msg["To"] = recipient

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
            <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; background: #eff6ff; padding: 12px; border-radius: 50%; font-size: 28px;">
                        🛡️
                    </div>
                    <h2 style="color: #1e293b; margin: 12px 0 4px 0; font-size: 20px;">Superadmin Verification</h2>
                    <p style="color: #64748b; font-size: 14px; margin: 0;">Universal Attendance System</p>
                </div>
                
                <p style="color: #334155; font-size: 15px; line-height: 1.5; margin: 16px 0;">
                    A one-time verification code was requested for root superadmin access to your attendance platform.
                </p>

                <div style="background: #f1f5f9; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0;">
                    <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #4338ca; font-family: monospace;">
                        {otp_code}
                    </span>
                </div>

                <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-bottom: 24px;">
                    This code is valid for <strong>10 minutes</strong>. Never share this code with anyone.
                </p>

                <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
                <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
                    If you did not request this code, please secure your email account immediately.
                </p>
            </div>
        </body>
        </html>
        """
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(msg["From"], [recipient], msg.as_string())

        print(f"[EMAIL] Successfully dispatched real OTP email to {recipient}")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send email to {recipient}: {e}")
        return False
