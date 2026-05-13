import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from pathlib import Path
from dotenv import load_dotenv

def send_otp_email(to_email: str, otp: str):
    env_path = Path(__file__).resolve().parents[2] / ".env"
    load_dotenv(dotenv_path=env_path, override=True)

    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))

    if not MAIL_USERNAME or not MAIL_PASSWORD:
        raise Exception("Cấu hình Email chưa đầy đủ trong file .env")

    message = MIMEMultipart("alternative")
    message["Subject"] = "Mã xác nhận khôi phục mật khẩu BayFood"
    message["From"] = MAIL_USERNAME
    message["To"] = to_email

    html_content = f"""
    <html>
      <body>
        <h2 style="color: #f97316;">BayFood</h2>
        <p>Xin chào,</p>
        <p>Bạn đã yêu cầu khôi phục mật khẩu. Mã OTP của bạn là:</p>
        <h3 style="background-color: #f3f4f6; padding: 10px; display: inline-block; letter-spacing: 2px;">{otp}</h3>
        <p>Mã này sẽ hết hạn trong vòng 5 phút.</p>
        <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
      </body>
    </html>
    """
    
    part = MIMEText(html_content, "html")
    message.attach(part)

    server = None
    try:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(MAIL_USERNAME, MAIL_PASSWORD)
        server.sendmail(MAIL_USERNAME, to_email, message.as_string())
    except smtplib.SMTPAuthenticationError:
        raise Exception("Sai tài khoản hoặc mật khẩu ứng dụng Gmail (Hãy kiểm tra lại App Password).")
    except smtplib.SMTPConnectError:
        raise Exception("Không thể kết nối tới máy chủ SMTP. Hãy kiểm tra mạng hoặc cấu hình SMTP.")
    except smtplib.SMTPException as e:
        raise Exception(f"Lỗi SMTP khi gửi email: {str(e)}")
    except Exception as e:
        raise Exception(f"Lỗi khi gửi email: {str(e)}")
    finally:
        if server is not None:
            try:
                server.quit()
            except Exception:
                pass
