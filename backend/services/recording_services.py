import requests
from fastapi import HTTPException
from services.db import query
from routes.id_search import get_release, get_artist

HEADERS = {"User-Agent": "collectionbrainz/0.1"}

def fetch_recording(mbid: str):
    res = requests.get(
        f"https://musicbrainz.org/ws/2/recording/{mbid}",
        params={"fmt": "json", "inc": "artists+releases"},
        headers=HEADERS,
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


def normalize_to_recordings(payload: dict):
    t = payload.get("type")
    entity_id = payload.get("id")
    meta = payload.get("meta")

    if not t or not entity_id:
        raise HTTPException(status_code=400, detail="Missing type or id")

    if t == "song":
        if meta and meta.get("artist_id") and meta.get("release_group_id"):
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