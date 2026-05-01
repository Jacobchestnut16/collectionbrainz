import os
import requests
from dotenv import load_dotenv

load_dotenv()

CLIENT_ID = os.getenv("MB_CLIENT_ID")
CLIENT_SECRET = os.getenv("MB_CLIENT_SECRET")
REDIRECT_URI = os.getenv("MB_REDIRECT_URI")

TOKEN_URL = "https://musicbrainz.org/oauth2/token"
USERINFO_URL = "https://musicbrainz.org/oauth2/userinfo"


def exchange_code(code: str):
    res = requests.post(
        TOKEN_URL,
        data={
            "grant_type": "authorization_code",
            "code": code,
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "redirect_uri": REDIRECT_URI,
        },
        timeout=10
    )
    return res.json()


def get_userinfo(access_token: str):
    res = requests.get(
        USERINFO_URL,
        headers={
            "Authorization": f"Bearer {access_token}",
            "User-Agent": "CollectionBrainz/1.0 (e16.jmc@gmail.com)",
            "Accept": "application/json",
        },
        timeout=20
    )

    print("USERINFO STATUS:", res.status_code)
    print("USERINFO BODY:", res.text)

    res.raise_for_status()
    return res.json()