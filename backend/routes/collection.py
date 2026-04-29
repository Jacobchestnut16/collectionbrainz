from fastapi import APIRouter, HTTPException, Depends, Header

from routes.wishlist import upsert_recording
from services.db import query
from services.auth import get_user_from_token, get_current_user_id

from routes.id_search import get_release, get_artist

import requests

from services.recording_services import normalize_to_recordings

router = APIRouter(prefix="/collection", tags=["collection"])


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
    print("has enter", payload)
    recordings = normalize_to_recordings(payload)

    print("has step one normalize", recordings)
    if not recordings:
        return {"exists": False}

    mbid = recordings[0]["mbid"]
    print("has step two only grab the fird mbid???", mbid)
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
from collections import defaultdict

@router.get("/list")
def get_collection(user_id: int = Depends(get_current_user_id)):
    rows = query("""
        SELECT r.*
        FROM collection c
        JOIN recordings r ON r.id = c.recording_id
        WHERE c.user_id = %s
        ORDER BY r.artist_name, r.release_name, r.title
    """, (user_id,), fetch=True)

    artists = {}

    for r in rows:
        artist_name = r["artist_name"] or "Unknown Artist"
        artist_id = r["artist_id"] or "unknown"

        release_id = r["release_id"]
        release_name = r["release_name"] or "Unknown Release"

        # --- artist ---
        if artist_id not in artists:
            artists[artist_id] = {
                "artist_name": artist_name,
                "artist_id": artist_id,
                "releases": {}
            }

        # --- release ---
        releases = artists[artist_id]["releases"]

        if release_id not in releases:
            releases[release_id] = {
                "id": release_id,
                "title": release_name,
                "release_id": r["release_id"],
                "release_group_id": r["release_group_id"],
                "artist_id": r["artist_id"],
                "tracks": []
            }

        # --- track ---
        releases[release_id]["tracks"].append({
            "id": r["mbid"],
            "title": r["title"],
            "release_id": r["release_id"],
            "release_group_id": r["release_group_id"]
        })

    return {
        "artists": [
            {
                **a,
                "releases": list(a["releases"].values())
            }
            for a in artists.values()
        ]
    }