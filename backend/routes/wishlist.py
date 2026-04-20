from fastapi import APIRouter, Request, HTTPException, Depends

from services import db
from services.db import query

router = APIRouter()

def get_user(request: Request):
    auth = request.headers.get("Authorization")

    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(status_code=401)

    token = auth.split(" ")[1]

    session = query(
        """
        SELECT user_id
        FROM user_sessions
        WHERE access_token = %s
        AND expires_at > NOW()
        """,
        (token,),
        fetch=True
    )

    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    user = query(
        "SELECT * FROM users WHERE id = %s",
        (session[0]["user_id"],),
        fetch=True
    )

    if not user:
        raise HTTPException(status_code=401)

    return user[0]

@router.get("/wishlist")
async def add_to_wishlist(item: dict, user=Depends(get_user)):
    query = """
    INSERT INTO wishlist (
        user_id, mbid, song_title, album_title,
        release_artist, mbid_image, list_name
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (user_id, list_name, mbid) DO NOTHING
    RETURNING *;
    """

    values = (
        user.id,
        item["mbid"],
        item.get("song_title"),
        item.get("album_title"),
        item.get("release_artist"),
        item.get("mbid_image"),
        item.get("list_name", "wishlist"),
    )

    row = db.fetch_one(query, values)
    return {"added": bool(row)}

@router.get("/wishlist")
async def get_wishlist(user=Depends(get_user)):
    return db.fetch_all(
        "SELECT * FROM wishlist WHERE user_id=%s ORDER BY date_added DESC",
        (user.id,)
    )

@router.delete("/wishlist")
async def remove_from_wishlist(mbid: str, user=Depends(get_user)):
    db.execute(
        "DELETE FROM wishlist WHERE user_id=%s AND mbid=%s",
        (user.id, mbid),
    )
    return {"removed": True}