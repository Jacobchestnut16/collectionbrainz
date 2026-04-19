import requests

MB_URL = "https://musicbrainz.org/ws/2"
HEADERS = {"User-Agent": "collectionbrainz/0.1"}

def search_mb(entity: str, query: str, limit=20, offset=0):
    try:
        inc_map = {
            "recording": "artist-credits+releases",
            "release": "artist-credits",
            "artist": ""
        }

        res = requests.get(
            f"{MB_URL}/{entity}/",
            params={
                "query": query,
                "fmt": "json",
                "limit": limit,
                "offset": offset,
                "inc": inc_map.get(entity, "")
            },
            headers=HEADERS,
            timeout=5
        )

        if not res.ok:
            return [], 0

        data = res.json()

        return data.get(entity + "s", []), data.get("count", 0)

    except requests.exceptions.RequestException:
        return [], 0


# ---------- normalization ----------

def norm_artist(a):
    return {
        "id": a["id"],
        "type": "artist",
        "title": a["name"],
        "subtitle": a.get("country") or a.get("disambiguation"),
        "artist": a["name"],
        "album": None,
        "score": int(a.get("score", 0))
    }


def norm_recording(r):
    artist = None
    album = None
    release_id = None

    if r.get("artist-credit"):
        artist = r["artist-credit"][0].get("name")

    # pick a usable release (prefer official if possible)
    if r.get("releases"):
        for rel in r["releases"]:
            # prefer official releases
            if rel.get("status") == "Official":
                album = rel.get("title")
                release_id = rel.get("id")
                break

        # fallback if no official found
        if not release_id:
            rel = r["releases"][0]
            album = rel.get("title")
            release_id = rel.get("id")

    return {
        "id": r["id"],
        "type": "recording",
        "title": r["title"],
        "subtitle": artist,
        "artist": artist,
        "album": album,
        "release_id": release_id,   # ← THIS is what your frontend needs
        "score": int(r.get("score", 0))
    }


def norm_release(r):
    artist = None

    if r.get("artist-credit"):
        artist = r["artist-credit"][0].get("name")

    return {
        "id": r["id"],
        "type": "release",
        "title": r["title"],
        "subtitle": artist,
        "artist": artist,
        "album": r["title"],
        "score": int(r.get("score", 0))
    }