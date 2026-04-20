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

@router.post("/collection")
async def add_to_collection(item: dict, user=Depends(get_user)):
    query = """
    INSERT INTO collection (
        user_id, mbid, song_title, album_title,
        release_artist, mbid_image
    )
    VALUES (%s, %s, %s, %s, %s, %s)
    ON CONFLICT (user_id, mbid) DO NOTHING
    RETURNING *;
    """

    values = (
        user.id,
        item["mbid"],
        item.get("song_title"),
        item.get("album_title"),
        item.get("release_artist"),
        item.get("mbid_image"),
    )

    row = db.fetch_one(query, values)
    return {"added": bool(row)}

@router.delete("/collection")
async def remove_from_collection(mbid: str, user=Depends(get_user)):
    db.execute(
        "DELETE FROM collection WHERE user_id=%s AND mbid=%s",
        (user.id, mbid),
    )
    return {"removed": True}

@router.get("/collection")
async def get_collection(user=Depends(get_user)):
    return db.fetch_all(
        "SELECT * FROM collection WHERE user_id=%s ORDER BY date_collected DESC",
        (user.id,)
    )