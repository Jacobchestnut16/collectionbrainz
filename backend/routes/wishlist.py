from fastapi import APIRouter, Header, HTTPException, Depends
from services.db import query
from services.auth import get_user_from_token

from routes.id_search import get_release, get_artist

import requests

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


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


# --------------------------------------------------
# FETCH RECORDING
# --------------------------------------------------
def fetch_recording(mbid: str):
    res = requests.get(
        f"https://musicbrainz.org/ws/2/recording/{mbid}",
        params={"fmt": "json", "inc": "artists+releases"},
        headers={"User-Agent": "collectionbrainz/0.1"},
        timeout=5
    )

    if res.status_code != 200:
        raise HTTPException(status_code=500, detail="Recording fetch failed")

    data = res.json()

    artist = None
    artist_id = None
    release = None
    release_id = None
    release_group_id = None

    if data.get("artist-credit"):
        artist = data["artist-credit"][0].get("name")
        artist_id = data["artist-credit"][0].get("artist", {}).get("id")

    if data.get("releases"):
        rel = data["releases"][0]
        release = rel.get("title")
        release_id = rel.get("id")
        release_group_id = rel.get("release-group", {}).get("id")

    return {
        "mbid": data.get("id"),
        "meta": {
            "title": data.get("title"),
            "artist": artist,
            "artist_id": artist_id,
            "release": release,
            "release_id": release_id,
            "release_group_id": release_group_id
        }
    }


# --------------------------------------------------
# NORMALIZE
# --------------------------------------------------
def normalize_to_recordings(payload: dict):
    t = payload.get("type")
    entity_id = payload.get("id")
    meta = payload.get("meta")

    if not t or not entity_id:
        raise HTTPException(status_code=400, detail="Missing type or id")

    if t == "song":
        if meta:
            return [{"mbid": entity_id, "meta": meta}]
        return [fetch_recording(entity_id)]

    if t == "album":
        rel = get_release(entity_id)

        out = []
        for m in rel.get("media", []):
            for tr in m.get("tracks", []):
                rec = tr.get("recording", {})

                out.append({
                    "mbid": rec.get("id"),
                    "meta": {
                        "title": rec.get("title"),
                        "artist": rel.get("artist-credit", [{}])[0].get("name"),
                        "artist_id": rel.get("artist-credit", [{}])[0].get("artist", {}).get("id"),
                        "release": rel.get("title"),
                        "release_id": rel.get("id"),
                        "release_group_id": rel.get("release-group", {}).get("id")
                    }
                })
        return out

    if t == "artist":
        artist = get_artist(entity_id)

        out = []
        for category in artist.get("releases", {}).values():
            for rel in category:
                full_rel = get_release(rel.get("release_id"))

                for m in full_rel.get("media", []):
                    for tr in m.get("tracks", []):
                        rec = tr.get("recording", {})

                        out.append({
                            "mbid": rec.get("id"),
                            "meta": {
                                "title": rec.get("title"),
                                "artist": artist.get("name"),
                                "artist_id": artist.get("id"),
                                "release": full_rel.get("title"),
                                "release_id": full_rel.get("id"),
                                "release_group_id": full_rel.get("release-group", {}).get("id")
                            }
                        })
        return out

    raise HTTPException(status_code=400, detail="Invalid type")


# --------------------------------------------------
# UPSERT RECORDING
# --------------------------------------------------
def upsert_recording(rec: dict):
    mbid = rec.get("mbid")
    meta = rec.get("meta", {})

    existing = query(
        "SELECT id FROM recordings WHERE mbid = %s",
        (mbid,),
        fetch=True
    )

    if existing:
        rid = existing[0]["id"]

        query("""
            UPDATE recordings SET
                title = COALESCE(%s, title),
                artist_name = COALESCE(%s, artist_name),
                artist_id = COALESCE(%s, artist_id),
                release_name = COALESCE(%s, release_name),
                release_id = COALESCE(%s, release_id),
                release_group_id = COALESCE(%s, release_group_id),
                image_url = COALESCE(%s, image_url),
                last_updated = NOW()
            WHERE id = %s
        """, (
            meta.get("title"),
            meta.get("artist"),
            meta.get("artist_id"),
            meta.get("release"),
            meta.get("release_id"),
            meta.get("release_group_id"),
            meta.get("image_url"),
            rid
        ))

        return rid

    new = query("""
        INSERT INTO recordings (
            mbid,
            title, artist_name, artist_id,
            release_name, release_id, release_group_id,
            image_url
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
        RETURNING id
    """, (
        mbid,
        meta.get("title"),
        meta.get("artist"),
        meta.get("artist_id"),
        meta.get("release"),
        meta.get("release_id"),
        meta.get("release_group_id"),
        meta.get("image_url"),
    ), fetch=True)

    return new[0]["id"]


# --------------------------------------------------
# PERMISSION CHECK
# --------------------------------------------------
def can_edit_wishlist(user_id: int, wishlist_id: int):
    row = query("""
        SELECT 1
        FROM wishlists w
        LEFT JOIN wishlist_editors e
            ON e.wishlist_id = w.id
            AND e.user_id = %s
        WHERE w.id = %s
        AND (w.user_id = %s OR e.user_id IS NOT NULL)
    """, (user_id, wishlist_id, user_id), fetch=True)

    return bool(row)


# --------------------------------------------------
# ADD
# --------------------------------------------------
@router.post("/{wishlist_id}/add")
def add_to_wishlist(
    wishlist_id: int,
    payload: dict,
    user_id: int = Depends(get_current_user_id)
):
    if not can_edit_wishlist(user_id, wishlist_id):
        raise HTTPException(status_code=403)

    recordings = normalize_to_recordings(payload)

    added = 0
    for r in recordings:
        rid = upsert_recording(r)

        query("""
            INSERT INTO wishlist_items (wishlist_id, recording_id)
            VALUES (%s, %s)
            ON CONFLICT DO NOTHING
        """, (wishlist_id, rid))

        added += 1

    return {"status": "ok", "added": added}


# --------------------------------------------------
# REMOVE
# --------------------------------------------------
@router.post("/{wishlist_id}/remove")
def remove_from_wishlist(
    wishlist_id: int,
    payload: dict,
    user_id: int = Depends(get_current_user_id)
):
    if not can_edit_wishlist(user_id, wishlist_id):
        raise HTTPException(status_code=403)

    recordings = normalize_to_recordings(payload)

    removed = 0
    for r in recordings:
        mbid = r.get("mbid")

        row = query(
            "SELECT id FROM recordings WHERE mbid = %s",
            (mbid,),
            fetch=True
        )

        if not row:
            continue

        rid = row[0]["id"]

        query("""
            DELETE FROM wishlist_items
            WHERE wishlist_id = %s AND recording_id = %s
        """, (wishlist_id, rid))

        removed += 1

    return {"status": "ok", "removed": removed}


# --------------------------------------------------
# GET LISTS (FIXED)
# --------------------------------------------------
@router.get("/lists")
def get_lists(user_id: int = Depends(get_current_user_id)):
    return query(
        "SELECT id, name FROM wishlists WHERE user_id=%s",
        (user_id,),
        fetch=True
    )


# --------------------------------------------------
# CREATE LIST (FIXED)
# --------------------------------------------------
@router.post("/create")
def create_list(
    payload: dict,
    user_id: int = Depends(get_current_user_id)
):
    name = payload.get("name")

    if not name:
        raise HTTPException(status_code=400, detail="Missing name")

    row = query(
        """
        INSERT INTO wishlists (user_id, name)
        VALUES (%s, %s)
        RETURNING id, name
        """,
        (user_id, name),
        fetch=True
    )

    return row[0]