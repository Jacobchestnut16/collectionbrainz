from fastapi import APIRouter, HTTPException, Depends, Header
from services.db import query
from services.auth import get_user_from_token

from routes.id_search import get_release, get_artist

import requests

router = APIRouter(prefix="/collection", tags=["collection"])


# --------------------------------------------------
# AUTH (same as wishlist)
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
        return existing[0]["id"]

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
# ADD
# --------------------------------------------------
@router.post("/add")
def add_to_collection(
    payload: dict,
    user_id: int = Depends(get_current_user_id)
):
    recordings = normalize_to_recordings(payload)

    added = 0
    for r in recordings:
        rid = upsert_recording(r)

        query("""
            INSERT INTO collection (user_id, recording_id)
            VALUES (%s, %s)
            ON CONFLICT DO NOTHING
        """, (user_id, rid))

        added += 1

    return {"status": "ok", "added": added}


# --------------------------------------------------
# REMOVE
# --------------------------------------------------
@router.post("/remove")
def remove_from_collection(
    payload: dict,
    user_id: int = Depends(get_current_user_id)
):
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
            DELETE FROM collection
            WHERE user_id = %s AND recording_id = %s
        """, (user_id, rid))

        removed += 1

    return {"status": "ok", "removed": removed}


# --------------------------------------------------
# CHECK
# --------------------------------------------------
@router.post("/has")
def has_item(
    payload: dict,
    user_id: int = Depends(get_current_user_id)
):
    recordings = normalize_to_recordings(payload)

    if not recordings:
        return {"exists": False}

    mbid = recordings[0]["mbid"]

    row = query(
        "SELECT id FROM recordings WHERE mbid = %s",
        (mbid,),
        fetch=True
    )

    if not row:
        return {"exists": False}

    rid = row[0]["id"]

    exists = query(
        "SELECT 1 FROM collection WHERE user_id=%s AND recording_id=%s",
        (user_id, rid),
        fetch=True
    )

    return {"exists": bool(exists)}


# --------------------------------------------------
# list list' contents
# --------------------------------------------------
@router.get("/list")
def get_collection(Authorization: str = Header(...)):
    user_id = get_current_user_id(Authorization)

    return query("""
        SELECT r.*
        FROM collection c
        JOIN recordings r ON r.id = c.recording_id
        WHERE c.user_id = %s
        ORDER BY r.artist_name, r.release_name, r.title
    """, (user_id,), fetch=True)