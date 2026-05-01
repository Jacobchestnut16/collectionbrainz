from fastapi import APIRouter, HTTPException

from services.cache import cached
from services.search_service import run_search

router = APIRouter()

@router.get("/search")
@cached(lambda q, offset=0, limit=20: f"search:{q}:{offset}:{limit}", ttl=120)
def search(q: str, offset: int = 0, limit: int = 20):
    try:
        return run_search(q, offset, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))