from fastapi import APIRouter, Header, HTTPException, Depends
from services.db import query
from services.auth import get_user_from_token

router = APIRouter(prefix="/users", tags=["users"])


# --------------------------------------------------
# AUTH (single source of truth)
# --------------------------------------------------
def get_current_user_id(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing token")

    token = authorization.replace("Bearer ", "")
    user = get_user_from_token(token)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid session")

    return user["id"]

@router.get("/users/search")
def search_users(q: str, user_id: int = Depends(get_current_user_id)):
    return query("""
        SELECT id, mb_username AS username
        FROM users
        WHERE mb_username ILIKE %s
        LIMIT 10
    """, (f"%{q}%",), fetch=True)