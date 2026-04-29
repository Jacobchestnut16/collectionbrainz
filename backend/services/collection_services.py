from services.db import query
from services.recording_services import normalize_to_recordings, upsert_recording


def add_to_collection(user_id: int, payload: dict):
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


def remove_from_collection(user_id: int, payload: dict):
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