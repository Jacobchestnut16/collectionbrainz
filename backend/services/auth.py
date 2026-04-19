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