import requests
from fastapi import APIRouter, HTTPException

from services.dashboard_service import norm_release, norm_listen
from services.cache import cached

router = APIRouter()

BASE_URL = "https://api.listenbrainz.org/1"
headers = {"User-Agent": "collectionbrainz/0.1"}


@router.get("/user/history/{username}")
@cached(lambda username: f"user_history:{username}", ttl=60)
def get_user_history(username: str):
    path = f"/user/{username}/listens"
    url = BASE_URL + path

    try:
        res = requests.get(url, headers=headers, timeout=5)

        if res.status_code != 200:
            raise HTTPException(status_code=res.status_code, detail=res.text)

        data = res.json()

        listens = data["payload"]["listens"]

        return {
            "payload": {
                "listens": [norm_listen(l) for l in listens]
            }
        }

    except Exception:
        raise HTTPException(status_code=500, detail="Upstream error")


@router.get("/sitewide/releases")
@cached(lambda: "sitewide_releases", ttl=300)
def get_sitewide_releases():
    url = BASE_URL + "/stats/sitewide/releases"

    res = requests.get(url, headers=headers, timeout=5)

    if res.status_code != 200:
        raise HTTPException(status_code=res.status_code, detail=res.text)

    data = res.json()

    return {
        "payload": {
            "releases": [norm_release(r) for r in data["payload"]["releases"]]
        }
    }

@router.get("/fresh-releases")
@cached(lambda: "fresh_releases", ttl=120)
def get_fresh_releases():
    url = BASE_URL + "/explore/fresh-releases"

    res = requests.get(url, headers=headers, timeout=5)

    if res.status_code != 200:
        raise HTTPException(status_code=res.status_code, detail=res.text)

    data = res.json()

    return {
        "payload": {
            "releases": [norm_release(r) for r in data["payload"]["releases"]]
        }
    }


@router.get("/user/top-albums/{username}")
@cached(lambda username: f"user_top_albums:{username}", ttl=300)
def get_user_top_albums(username: str):
    url = BASE_URL + f"/stats/user/{username}/releases"

    res = requests.get(url, headers=headers, timeout=5)

    if res.status_code != 200:
        raise HTTPException(status_code=res.status_code, detail=res.text)

    data = res.json()

    return {
        "payload": {
            "releases": [norm_release(r) for r in data["payload"]["releases"]]
        }
    }