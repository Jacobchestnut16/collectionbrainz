import requests
import time

BASE_URL = "https://musicbrainz.org/ws/2"

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
    artist_id = None
    album = None
    release_id = None
    release_group_id = None

    if r.get("artist-credit"):
        artist = r["artist-credit"][0].get("name")
        artist_id = r["artist-credit"][0].get("artist", {}).get("id")

    if r.get("releases"):
        for rel in r["releases"]:
            if rel.get("status") == "Official":
                album = rel.get("title")
                release_id = rel.get("id")
                release_group_id = rel.get("release-group", {}).get("id")
                break

        if not release_id:
            rel = r["releases"][0]
            album = rel.get("title")
            release_id = rel.get("id")
            release_group_id = rel.get("release-group", {}).get("id")

    return {
        "id": r["id"],
        "type": "recording",
        "title": r["title"],
        "subtitle": artist,
        "artist": artist,
        "artist_id": artist_id,
        "album": album,
        "release_id": release_id,
        "release_group_id": release_group_id,  # ✅ THIS WAS MISSING
        "score": int(r.get("score", 0))
    }


def norm_release(r):
    artist = None
    artist_id = None

    if r.get("artist-credit"):
        artist = r["artist-credit"][0].get("name")
        artist_id = r["artist-credit"][0].get("artist", {}).get("id")

    return {
        "id": r["id"],
        "release_group_id": r.get("release-group", {}).get("id"),  # ✅ ADD THIS
        "type": "release",
        "title": r["title"],
        "subtitle": artist,
        "artist": artist,
        "artist_id": artist_id,
        "album": r["title"],
        "score": int(r.get("score", 0))
    }


def score_release(r):
    score = 0

    status = (r.get("status") or "").lower()
    packaging = (r.get("packaging") or "").lower()
    country = (r.get("country") or "").upper()
    title = (r.get("title") or "").lower()

    if status == "official":
        score += 50

    if packaging and packaging != "none":
        score += 20

    if country in ["US", "GB"]:
        score += 15

    if "amazon" in title:
        score -= 40

    if "unknown" in title:
        score -= 20

    if "deluxe" in title:
        score += 5

    return score

# ---------- fetch ----------

# add near top

def mb_request(url, params):
    for attempt in range(5):
        try:
            res = requests.get(url, params=params, headers=HEADERS, timeout=10)

            if res.status_code == 200:
                return res

            if res.status_code == 503:
                wait = 2 ** attempt
                print(f"503 retry in {wait}s...")
                time.sleep(wait)
                continue

            raise Exception(f"MusicBrainz error: {res.status_code}")

        except requests.exceptions.RequestException:
            time.sleep(2 ** attempt)

    raise Exception("MusicBrainz failed after retries")

def fetch_all_releases(artist_id: str):
    all_releases = []
    offset = 0
    limit = 100

    while True:
        res = mb_request(
            f"{BASE_URL}/release",
            {
                "fmt": "json",
                "artist": artist_id,
                "limit": limit,
                "offset": offset,
                "inc": "release-groups",
            }
        )

        data = res.json()
        releases = data.get("releases", [])
        all_releases.extend(releases)

        if len(releases) < limit:
            break

        offset += limit
        time.sleep(1.1)  # required for MB

    return all_releases


def fetch_artist_info(artist_id: str):
    res = requests.get(
        f"{BASE_URL}/artist/{artist_id}",
        params={"fmt": "json"},
        headers=HEADERS,
        timeout=5,
    )

    if res.status_code != 200:
        raise Exception(f"Artist fetch failed: {res.status_code}")

    return res.json()


# ---------- transform ----------

def group_and_categorize_releases(all_releases: list):
    groups = {}
    categorized = {
        "albums": [],
        "eps": [],
        "singles": [],
        "other": []
    }

    for r in all_releases:
        rg = r.get("release-group", {})
        rg_id = rg.get("id")

        if not rg_id:
            continue

        # create group if missing
        if rg_id not in groups:
            groups[rg_id] = {
                "id": rg_id,  # UI identity
                "release_group_id": rg_id,  # ✅ THIS is what every page will use for images
                "title": rg.get("title"),
                "type": rg.get("primary-type"),
                "date": r.get("date"),
                "release_id": r.get("id"),  # still used for tracks
                "score": score_release(r),
                "versions": []
            }

        # always store ALL versions
        groups[rg_id]["versions"].append({
            "id": r.get("id"),
            "title": r.get("title"),
            "date": r.get("date"),
            "country": r.get("country"),
            "format": r.get("packaging"),
        })

        # replace if better version found
        new_score = score_release(r)
        if new_score > groups[rg_id]["score"]:
            groups[rg_id]["score"] = new_score
            groups[rg_id]["release_id"] = r.get("id")
            groups[rg_id]["date"] = r.get("date")

    # remove internal score
    for g in groups.values():
        g.pop("score", None)

    # categorize
    for g in groups.values():
        t = (g.get("type") or "").lower()

        if t == "album":
            categorized["albums"].append(g)
        elif t == "ep":
            categorized["eps"].append(g)
        elif t == "single":
            categorized["singles"].append(g)
        else:
            categorized["other"].append(g)

    return categorized


def sort_by_date(items: list):
    return sorted(items, key=lambda x: x.get("date") or "", reverse=True)


def sort_all_categories(categorized: dict):
    return {k: sort_by_date(v) for k, v in categorized.items()}


# ---------- high-level ----------
from functools import lru_cache

@lru_cache(maxsize=100)
def build_artist_payload(artist_id: str):
    all_releases = fetch_all_releases(artist_id)
    artist_data = fetch_artist_info(artist_id)

    categorized = group_and_categorize_releases(all_releases)
    categorized = sort_all_categories(categorized)

    return {
        "id": artist_data.get("id"),
        "name": artist_data.get("name"),
        "releases": categorized
    }