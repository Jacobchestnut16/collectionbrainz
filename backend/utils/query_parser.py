import re

def parse_query(q: str):
    base = q
    filters = {}

    if "[" in q and "]" in q:
        base, raw = q.split("[", 1)
        raw = raw.rstrip("]")
        parts = [p.strip() for p in raw.split(",")]

        for p in parts:
            if "=" in p:
                k, v = p.split("=", 1)
                filters[k.strip().lower()] = v.strip()

    return base.strip(), filters