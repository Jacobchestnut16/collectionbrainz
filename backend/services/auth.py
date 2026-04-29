from services.db import query

def get_user_from_token(token: str):
    session = query(
        """
        SELECT u.*
        FROM user_sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.access_token = %s
        AND s.expires_at > NOW()
        """,
        (token,),
        fetch=True
    )

    return session[0] if session else None

from fastapi import Header, HTTPException
def get_current_user_id(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing token")

    token = authorization.replace("Bearer ", "")
    user = get_user_from_token(token)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid session")

    return user["id"]