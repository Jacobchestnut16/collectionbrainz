from fastapi import APIRouter, Depends
from services.db import query
from services.auth import  get_current_user_id

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/users/search")
def search_users(q: str, user_id: int = Depends(get_current_user_id)):
    return query("""
        SELECT id, mb_username AS username
        FROM users
        WHERE mb_username ILIKE %s
        LIMIT 10
    """, (f"%{q}%",), fetch=True)