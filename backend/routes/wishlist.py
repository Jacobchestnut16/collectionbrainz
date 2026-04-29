from fastapi import APIRouter, HTTPException, Depends

from routes.users import get_current_user_id
from services.db import query

from services.recording_services import normalize_to_recordings, upsert_recording
from services.wishlist_service import can_edit_wishlist, can_view_wishlist

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


# --------------------------------------------------
# GET LISTS (FIXED)
# --------------------------------------------------
@router.get("/lists")
def get_lists(user_id: int = Depends(get_current_user_id)):
    return query("""
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
    """, (user_id, user_id, user_id), fetch=True)


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
# list list's contents
# --------------------------------------------------
@router.get("/{wishlist_id}/list")
def get_wishlist_items(wishlist_id: int, user_id: int = Depends(get_current_user_id)):
    if not can_view_wishlist(user_id, wishlist_id):
        raise HTTPException(status_code=403)

    rows = query("""
        SELECT r.*
        FROM wishlist_items wi
        JOIN recordings r ON r.id = wi.recording_id
        WHERE wi.wishlist_id = %s
        ORDER BY r.artist_name, r.release_name, r.title
    """, (wishlist_id,), fetch=True)

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

        releases = artists[artist_id]["releases"]

        # --- release ---
        if release_id not in releases:
            releases[release_id] = {
                "id": release_id,
                "title": release_name,
                "release_id": release_id,
                "release_group_id": r["release_group_id"],  # IMPORTANT (images)
                "tracks": []
            }

        # --- track ---
        releases[release_id]["tracks"].append({
            "id": r["mbid"],
            "title": r["title"]
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

@router.post("/{wishlist_id}/add-editor")
def add_editor(
    wishlist_id: int,
    payload: dict,
    user_id: int = Depends(get_current_user_id)
):
    target_user_id = payload.get("user_id")

    # only owner can add editors
    owner = query(
        "SELECT user_id FROM wishlists WHERE id=%s",
        (wishlist_id,),
        fetch=True
    )

    if not owner or owner[0]["user_id"] != user_id:
        raise HTTPException(status_code=403)

    query("""
        INSERT INTO wishlist_editors (wishlist_id, user_id, can_edit)
        VALUES (%s, %s, TRUE)
        ON CONFLICT DO NOTHING
    """, (wishlist_id, target_user_id))

    return {"status": "ok"}

@router.post("/{wishlist_id}/remove-editor")
def remove_editor(
    wishlist_id: int,
    payload: dict,
    user_id: int = Depends(get_current_user_id)
):
    target_user_id = payload.get("user_id")

    owner = query(
        "SELECT user_id FROM wishlists WHERE id=%s",
        (wishlist_id,),
        fetch=True
    )

    if not owner or owner[0]["user_id"] != user_id:
        raise HTTPException(status_code=403)

    query("""
        DELETE FROM wishlist_editors
        WHERE wishlist_id=%s AND user_id=%s
    """, (wishlist_id, target_user_id))

    return {"status": "ok"}

@router.post("/{wishlist_id}/visibility")
def update_visibility(
    wishlist_id: int,
    payload: dict,
    user_id: int = Depends(get_current_user_id)
):
    visibility = payload.get("visibility")

    if visibility not in ["private", "friends", "public"]:
        raise HTTPException(status_code=400)

    owner = query(
        "SELECT user_id FROM wishlists WHERE id=%s",
        (wishlist_id,),
        fetch=True
    )

    if not owner or owner[0]["user_id"] != user_id:
        raise HTTPException(status_code=403)

    query("""
        UPDATE wishlists
        SET visibility = %s
        WHERE id = %s
    """, (visibility, wishlist_id))

    return {"status": "ok"}

@router.get("/{wishlist_id}/meta")
def get_meta(wishlist_id: int, user_id: int = Depends(get_current_user_id)):
    if not can_view_wishlist(user_id, wishlist_id):
        raise HTTPException(status_code=403)

    w = query(
        "SELECT visibility FROM wishlists WHERE id=%s",
        (wishlist_id,),
        fetch=True
    )[0]

    editors = query("""
        SELECT u.id, u.mb_username AS username
        FROM wishlist_editors e
        JOIN users u ON u.id = e.user_id
        WHERE e.wishlist_id = %s
    """, (wishlist_id,), fetch=True)

    return {
        "visibility": w["visibility"],
        "editors": editors
    }