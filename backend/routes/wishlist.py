from fastapi import APIRouter, HTTPException, Depends
import time
import logging

from routes.users import get_current_user_id
from services.db import query
from services.recording_services import normalize_to_recordings, upsert_recording
from services.wishlist_service import can_edit_wishlist, can_view_wishlist

router = APIRouter(prefix="/wishlist", tags=["wishlist"])

log = logging.getLogger("wishlist")

# --------------------------------------------------
# RETRY CORE
# --------------------------------------------------
MAX_RETRIES = 4
BASE_DELAY = 0.25


def retry_db(fn, label, *args, **kwargs):
    last_err = None

    for i in range(MAX_RETRIES):
        try:
            return fn(*args, **kwargs)

        except Exception as e:
            last_err = e
            wait = BASE_DELAY * (2 ** i)

            log.warning(f"{label} failed attempt {i+1}/{MAX_RETRIES}: {e}")
            time.sleep(wait)

    raise last_err


def safe_query(sql, params=None, fetch=False, label="query"):
    return retry_db(query, label, sql, params, fetch=fetch)


def safe_upsert_recording(r):
    return retry_db(upsert_recording, "upsert_recording", r)


# --------------------------------------------------
# GET LISTS
# --------------------------------------------------
@router.get("/lists")
def get_lists(user_id: int = Depends(get_current_user_id)):
    return safe_query("""
        SELECT DISTINCT w.id, w.name
        FROM wishlists w
        LEFT JOIN wishlist_editors e
            ON e.wishlist_id = w.id AND e.user_id = %s
        LEFT JOIN user_friends f
            ON f.user_id = w.user_id AND f.friend_id = %s
        WHERE
            w.user_id = %s
            OR e.user_id IS NOT NULL
            OR w.visibility = 'public'
            OR (w.visibility = 'friends' AND f.friend_id IS NOT NULL)
    """, (user_id, user_id, user_id), fetch=True, label="get_lists")


# --------------------------------------------------
# CREATE LIST
# --------------------------------------------------
@router.post("/create")
def create_list(payload: dict, user_id: int = Depends(get_current_user_id)):
    name = payload.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="Missing name")

    row = safe_query("""
        INSERT INTO wishlists (user_id, name)
        VALUES (%s, %s)
        RETURNING id, name
    """, (user_id, name), fetch=True, label="create_list")

    return row[0]


# --------------------------------------------------
# ADD (HARDENED)
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

    result = {
        "status": "ok",
        "added": 0,
        "failed_upsert": 0,
        "failed_insert": 0,
        "total": len(recordings)
    }

    for r in recordings:
        try:
            rid = safe_upsert_recording(r)
        except Exception as e:
            log.error(f"upsert failed: {e}")
            result["failed_upsert"] += 1
            continue

        try:
            safe_query("""
                INSERT INTO wishlist_items (wishlist_id, recording_id)
                VALUES (%s, %s)
                ON CONFLICT DO NOTHING
            """, (wishlist_id, rid), fetch=False, label="insert_wishlist_item")

            result["added"] += 1

        except Exception as e:
            log.error(f"insert failed: {e}")
            result["failed_insert"] += 1

    return result


# --------------------------------------------------
# REMOVE (HARDENED)
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

    result = {"removed": 0, "skipped": 0}

    for r in recordings:
        mbid = r.get("mbid")
        if not mbid:
            result["skipped"] += 1
            continue

        rows = safe_query(
            "SELECT id FROM recordings WHERE mbid = %s",
            (mbid,),
            fetch=True,
            label="lookup_recording"
        )

        if not rows:
            result["skipped"] += 1
            continue

        rid = rows[0]["id"]

        try:
            safe_query("""
                DELETE FROM wishlist_items
                WHERE wishlist_id = %s AND recording_id = %s
            """, (wishlist_id, rid), label="delete_wishlist_item")

            result["removed"] += 1

        except Exception as e:
            log.error(f"delete failed: {e}")
            result["skipped"] += 1

    return result


# --------------------------------------------------
# LIST CONTENTS (UNCHANGED LOGIC)
# --------------------------------------------------
@router.get("/{wishlist_id}/list")
def get_wishlist_items(wishlist_id: int, user_id: int = Depends(get_current_user_id)):
    if not can_view_wishlist(user_id, wishlist_id):
        raise HTTPException(status_code=403)

    rows = safe_query("""
        SELECT r.*
        FROM wishlist_items wi
        JOIN recordings r ON r.id = wi.recording_id
        WHERE wi.wishlist_id = %s
        ORDER BY r.artist_name, r.release_name, r.title
    """, (wishlist_id,), fetch=True, label="get_wishlist_items")

    artists = {}

    for r in rows:
        artist_name = r["artist_name"] or "Unknown Artist"
        artist_id = r["artist_id"] or "unknown"

        release_id = r["release_id"]
        release_name = r["release_name"] or "Unknown Release"

        if artist_id not in artists:
            artists[artist_id] = {
                "artist_name": artist_name,
                "artist_id": artist_id,
                "releases": {}
            }

        releases = artists[artist_id]["releases"]

        if release_id not in releases:
            releases[release_id] = {
                "id": release_id,
                "title": release_name,
                "release_id": release_id,
                "release_group_id": r["release_group_id"],
                "tracks": []
            }

        releases[release_id]["tracks"].append({
            "id": r["mbid"],
            "title": r["title"]
        })

    return {
        "artists": [
            {**a, "releases": list(a["releases"].values())}
            for a in artists.values()
        ]
    }


# --------------------------------------------------
# EDITORS (SAFE WRAPPED)
# --------------------------------------------------
@router.post("/{wishlist_id}/add-editor")
def add_editor(wishlist_id: int, payload: dict, user_id: int = Depends(get_current_user_id)):
    target = payload.get("user_id")

    owner = safe_query(
        "SELECT user_id FROM wishlists WHERE id=%s",
        (wishlist_id,),
        fetch=True,
        label="check_owner"
    )

    if not owner or owner[0]["user_id"] != user_id:
        raise HTTPException(status_code=403)

    safe_query("""
        INSERT INTO wishlist_editors (wishlist_id, user_id, can_edit)
        VALUES (%s, %s, TRUE)
        ON CONFLICT DO NOTHING
    """, (wishlist_id, target), label="add_editor")

    return {"status": "ok"}


@router.post("/{wishlist_id}/remove-editor")
def remove_editor(wishlist_id: int, payload: dict, user_id: int = Depends(get_current_user_id)):
    target = payload.get("user_id")

    owner = safe_query(
        "SELECT user_id FROM wishlists WHERE id=%s",
        (wishlist_id,),
        fetch=True,
        label="check_owner"
    )

    if not owner or owner[0]["user_id"] != user_id:
        raise HTTPException(status_code=403)

    safe_query("""
        DELETE FROM wishlist_editors
        WHERE wishlist_id=%s AND user_id=%s
    """, (wishlist_id, target), label="remove_editor")

    return {"status": "ok"}


# --------------------------------------------------
# VISIBILITY
# --------------------------------------------------
@router.post("/{wishlist_id}/visibility")
def update_visibility(wishlist_id: int, payload: dict, user_id: int = Depends(get_current_user_id)):
    visibility = payload.get("visibility")

    if visibility not in ["private", "friends", "public"]:
        raise HTTPException(status_code=400)

    owner = safe_query(
        "SELECT user_id FROM wishlists WHERE id=%s",
        (wishlist_id,),
        fetch=True,
        label="check_owner"
    )

    if not owner or owner[0]["user_id"] != user_id:
        raise HTTPException(status_code=403)

    safe_query("""
        UPDATE wishlists
        SET visibility = %s
        WHERE id = %s
    """, (visibility, wishlist_id), label="update_visibility")

    return {"status": "ok"}


# --------------------------------------------------
# META
# --------------------------------------------------
@router.get("/{wishlist_id}/meta")
def get_meta(wishlist_id: int, user_id: int = Depends(get_current_user_id)):
    if not can_view_wishlist(user_id, wishlist_id):
        raise HTTPException(status_code=403)

    w = safe_query(
        "SELECT visibility FROM wishlists WHERE id=%s",
        (wishlist_id,),
        fetch=True,
        label="get_meta_visibility"
    )[0]

    editors = safe_query("""
        SELECT u.id, u.mb_username AS username
        FROM wishlist_editors e
        JOIN users u ON u.id = e.user_id
        WHERE e.wishlist_id = %s
    """, (wishlist_id,), fetch=True, label="get_meta_editors")

    return {
        "visibility": w["visibility"],
        "editors": editors
    }