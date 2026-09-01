"""Small HTTP-based email helper; works on hosts that block SMTP on free plans."""
import logging
import httpx

from app.core.config import settings

logger = logging.getLogger("email_service")


async def send_password_reset_email(email: str, reset_link: str) -> bool:
    """Send a password reset email through Resend, returning False when unconfigured."""
    if not settings.RESEND_API_KEY:
        logger.warning("Password reset requested but RESEND_API_KEY is not configured.")
        return False

    sender = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
    payload = {
        "from": sender,
        "to": [email],
        "subject": "Reset your AI Job Finder password",
        "html": (
            "<p>We received a request to reset your password.</p>"
            f"<p><a href=\"{reset_link}\">Reset your password</a></p>"
            "<p>This link expires in 3 hours. If you did not request it, you can ignore this email.</p>"
        ),
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                json=payload,
            )
            response.raise_for_status()
        return True
    except httpx.HTTPError as exc:
        logger.error("Unable to send password reset email: %s", exc)
        return False
