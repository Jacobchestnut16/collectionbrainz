import requests

BASE_URL = "https://api.listenbrainz.org/1"
headers = {"User-Agent": "collectionbrainz/0.1"}

def extract_ids(item):
    tm = item.get("track_metadata", {})
    mb = tm.get("mbid_mapping", {})
    ai = tm.get("additional_info", {})

    artist_id = (
        mb.get("artist_mbids", [None])[0]
        or ai.get("artist_mbids", [None])[0]
        or item.get("artist_mbid")
    )

    release_id = (
        mb.get("release_mbid")
        or ai.get("release_mbid")
        or item.get("release_mbid")
    )

    release_group_id = (
        mb.get("release_group_mbid")
        or ai.get("release_group_mbid")
        or None
    )

    return artist_id, release_id, release_group_id


def fetch_release_group(release_mbid):
    if not release_mbid:
        return None

    url = f"https://musicbrainz.org/ws/2/release/{release_mbid}"
    params = {
        "fmt": "json",
        "inc": "release-groups"
    }

    try:
        r = requests.get(url, params=params, headers=headers, timeout=5)
        if r.status_code != 200:
            return None

        data = r.json()
        return data.get("release-group", {}).get("id")
    except Exception:
        return None

def norm_listen(l):
    artist_id, release_id, rg_id = extract_ids(l)

    tm = l.get("track_metadata", {})

    release_group_id = rg_id
    if not release_group_id or release_group_id == "":
        release_group_id = fetch_release_group(release_id)

    return {
        "id": l.get("recording_msid"),
        "type": "listen",
        "title": tm.get("track_name"),
        "artist": tm.get("artist_name"),
        "artist_id": artist_id,
        "release_id": release_id,
        "release_group_id": release_group_id,
        "release": tm.get("release_name"),
    }

def norm_release(r):
    release_id = r.get("release_mbid")

    release_group_id = r.get("release_group_mbid")
    if not release_group_id or release_group_id == "":
        release_group_id = fetch_release_group(r.get("release_mbid"))
    return {
        "id": release_id,
        "type": "release",
        "title": r.get("release_name"),
        "artist": r.get("artist_name"),
        "artist_id": (r.get("artist_mbids") or [None])[0],
        "release_id": release_id,
        "release_group_id": release_group_id,
    }
