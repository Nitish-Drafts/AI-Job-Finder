import asyncio
import traceback
import uuid

from app.database import SessionLocal
from app.api.auth import signup
from app.schemas.schemas import UserCreate

async def main():
    db = SessionLocal()

    try:
        email = f"debug-{uuid.uuid4().hex[:8]}@example.com"

        user = UserCreate(
            email=email,
            full_name="Debug User",
            password="TestPassword123!",
            role="user",
            is_active=True,
            provider="local"
        )

        print("Testing signup with:", email)

        result = await signup(user, db)

        print("SUCCESS:")
        print(result)

    except Exception:
        print("SIGNUP FAILED:")
        traceback.print_exc()

    finally:
        await db.close()

asyncio.run(main())
