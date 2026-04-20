from fastapi import APIRouter
from fastapi.responses import RedirectResponse
from services.musicbrainz_oauth import exchange_code, get_userinfo
from services.db import query
import os
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()

router = APIRouter()

@router.get("/auth/login")
def login():
    return RedirectResponse(
        f"https://musicbrainz.org/oauth2/authorize"
        f"?response_type=code"
        f"&client_id={os.getenv('MB_CLIENT_ID')}"
        f"&redirect_uri={os.getenv('MB_REDIRECT_URI')}"
        f"&scope=profile email"
    )

@router.get("/auth/callback")
def callback(code: str):
    token_data = exchange_code(code)

    access_token = token_data["access_token"]
    refresh_token = token_data.get("refresh_token")

    userinfo = get_userinfo(access_token)

    mb_user_id = userinfo.get("metabrainz_user_id")   # PRIMARY KEY
    mb_username = userinfo.get("sub")                  # display name
    mb_email = userinfo.get("email")
    mb_user_id = str(userinfo.get("metabrainz_user_id"))

    if not mb_user_id:
        raise ValueError(userinfo)

    user = query(
        "SELECT * FROM users WHERE mb_user_id = %s",
        (mb_user_id,),
        fetch=True
    )

    if not user:
        user = query(
            """
            INSERT INTO users (mb_user_id, mb_username, mb_email)
            VALUES (%s, %s, %s)
            RETURNING *
            """,
            (mb_user_id, mb_username, mb_email),
            fetch=True
        )

    user = user[0]

    query(
        """
        INSERT INTO user_sessions (
            user_id,
            access_token,
            refresh_token,
            expires_at
        )
        VALUES (%s, %s, %s, NOW() + interval '1 hour')
        """,
        (user["id"], access_token, refresh_token)
    )

    print(access_token)

    return RedirectResponse("http://localhost:5173/auth?token=" + access_token)