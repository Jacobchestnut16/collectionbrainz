import random
from datetime import datetime

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
import requests
import secrets

from routes.search import router as search_router
from routes.auth import router as auth_router
from routes.wishlist import router as wishlist_router
from services.auth import get_user_from_token

# from routes.collection import router as collection_router
app = FastAPI()

BASE_URL = "https://api.listenbrainz.org"

ALLOWED_PREFIXES = [
    "/1/user/",
    "/1/stats/",
    "/1/explore/",
]

origins = [
    "http://localhost:5173",  # your React dev server
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search_router)
app.include_router(search_router)
app.include_router(auth_router)
app.include_router(wishlist_router)
# app.include_router(collection_router)

system = {}

@app.get("/me")
def me(Authorization: str = Header(None)):
    if not Authorization:
        raise HTTPException(status_code=401, detail="Missing token")

    token = Authorization.replace("Bearer ", "")

    user = get_user_from_token(token)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid session")

    return {
        "id": user["id"],
        "mb_user_id": user["mb_user_id"],
        "mb_username": user["mb_username"],
        "mb_email": user["mb_email"]
    }


@app.get("/lb/{full_path:path}")
def listenbrainz_proxy(full_path: str):
    path = "/" + full_path

    if not any(path.startswith(p) for p in ALLOWED_PREFIXES):
        raise HTTPException(status_code=403, detail="Not allowed")

    url = BASE_URL + path

    try:
        res = requests.get(url, headers={
            "User-Agent": "collectionbrainz/0.1"
        }, timeout=5)

        if (res.status_code != 200):
            print(f"GET {path} {res.status_code}: full-uri:{url},status:{res.status_code},results:{res.text}")

        return res.json()
    except Exception:
        raise HTTPException(status_code=500, detail="Upstream error")



# https://jellyfin.l1.chestnutsprogramming.com/Items?IncludeItemTypes=Audio&Recursive=true&api_key=9057dbc5a90d486faa4079ea5086589d

"""
{
  "Items": [
    {
      "Name": "!!!!!!!",
      "ServerId": "8a753db05dc04055ae1bde20a52c2322",
      "Id": "91ee1e301a741f7eb702ac48936925d0",
      "HasLyrics": false,
      "Container": "flac",
      "PremiereDate": "2019-01-01T00:00:00.0000000Z",
      "ChannelId": null,
      "RunTimeTicks": 135783670,
      "ProductionYear": 2019,
      "IndexNumber": 1,
      "ParentIndexNumber": 1,
      "IsFolder": false,
      "Type": "Audio",
      "ParentLogoItemId": "a17d5f7e28bfdcb185ef95463d34853d",
      "ParentBackdropItemId": "a17d5f7e28bfdcb185ef95463d34853d",
      "ParentBackdropImageTags": [
        "d8d45a900406cd8d577db326857a7cb7"
      ],
      "Artists": [
        "Billie Eilish"
      ],
      "ArtistItems": [
        {
          "Name": "Billie Eilish",
          "Id": "a17d5f7e28bfdcb185ef95463d34853d"
        }
      ],
      "Album": "WHEN WE ALL FALL ASLEEP, WHERE DO WE GO?",
      "AlbumId": "192ced6eddf4f6a015f3fbe1ae8a5b10",
      "AlbumPrimaryImageTag": "480f0ccf7e7814ce649f6bfd01176f85",
      "AlbumArtist": "Billie Eilish",
      "AlbumArtists": [
        {
          "Name": "Billie Eilish",
          "Id": "a17d5f7e28bfdcb185ef95463d34853d"
        }
      ],
      "ImageTags": {
        "Primary": "4d74ae6b50c0862623ff2c353bcb4cab"
      },
      "BackdropImageTags": [],
      "ParentLogoImageTag": "13469d3f0254fd4a33906414c9dc907d",
      "ImageBlurHashes": {
        "Primary": {
          "4d74ae6b50c0862623ff2c353bcb4cab": "eH8D^Qxu9GIVoLazayayj[oe01M|?H%2a{ayofofWBR*?bt7IURjWB",
          "480f0ccf7e7814ce649f6bfd01176f85": "eH8D^Qxu9GIVoLazayayj[oe01M|?H%2a{ayofofWBR*?bt7IURjWB"
        },
        "Logo": {
          "13469d3f0254fd4a33906414c9dc907d": "OjCsjjofj[ofofj[ayj[fQfQj[j[fQay00ayayWBWBayj["
        },
        "Backdrop": {
          "d8d45a900406cd8d577db326857a7cb7": "WVH^qq-n0LxF%2w]aKWBofs:oJWBIpofoeV@ozt7-ooKRQofkCV@"
        }
      },
      "LocationType": "FileSystem",
      "MediaType": "Audio",
      "NormalizationGain": 1.2000008
    }
  ]
}
"""