import requests
from fastapi import APIRouter, HTTPException

from services.musicbrainz import build_artist_payload

router = APIRouter()

BASE_URL = "https://musicbrainz.org/ws/2"
headers = {"User-Agent": "collectionbrainz/0.1"}

@router.get("/artist/{artist_id}")
def get_artist(artist_id: str):
    try:
        return build_artist_payload(artist_id)
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail="Upstream error")


@router.get("/release/{release_id}")
def get_release(release_id: str):
    path = f"/release/{release_id}"
    url = BASE_URL + path
    try:
        res = requests.get(url,
                           params={
                               "fmt": "json",
                               "inc": "recordings"
                           },
                           headers=headers,
                           timeout=5)

        if (res.status_code != 200):
            print(f"GET {path} {res.status_code}: full-uri:{url},status:{res.status_code},results:{res.text}")

        return res.json()
    except Exception:
        raise HTTPException(status_code=500, detail="Upstream error")