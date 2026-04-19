from utils.query_parser import parse_query
from services.musicbrainz import (
    search_mb,
    norm_artist,
    norm_recording,
    norm_release
)


def build_mb_query(base: str, filters: dict, entity: str):
    parts = []

    # map correct field names
    field_map = {
        "recording": "recording",
        "artist": "artist",
        "release": "release"
    }

    base_field = field_map.get(entity, entity)

    if base:
        parts.append(f'{base_field}:"{base}"')

    if "artist" in filters:
        parts.append(f'artist:"{filters["artist"]}"')

    if "album" in filters:
        parts.append(f'release:"{filters["album"]}"')

    # optional but HIGH impact
    if entity == "recording":
        parts.append("primarytype:album")
        parts.append("status:official")

    return " AND ".join(parts)


def boost_score(item, query):
    name = (item["title"] or "").lower()
    q = query.lower()

    score = item["score"]

    if name == q:
        score += 100
    elif name.startswith(q):
        score += 60
    elif q in name:
        score += 30

    # prefer recordings slightly
    if item["type"] == "recording":
        score += 10

    return score


def run_search(q: str, offset: int = 0, limit: int = 20):
    base, filters = parse_query(q)

    results = []
    total = 0

    if filters:
        mb_query = build_mb_query(base, filters, "recording")
        recs, count = search_mb("recording", mb_query, limit, offset)
        results += [norm_recording(r) for r in recs]
        total = count

    else:
        # split offset across types (simple approach)
        per_type = limit // 3

        artists, acount = search_mb("artist", base, per_type, offset)
        recordings, rcount = search_mb("recording", base, per_type, offset)
        releases, relcount = search_mb("release", base, per_type, offset)

        results += [norm_artist(a) for a in artists]
        results += [norm_recording(r) for r in recordings]
        results += [norm_release(r) for r in releases]

        total = acount + rcount + relcount

    return {
        "results": results,
        "offset": offset,
        "limit": limit,
        "total": total
    }