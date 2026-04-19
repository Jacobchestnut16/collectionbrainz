from fastapi import APIRouter, HTTPException
from services.search_service import run_search

router = APIRouter()

@router.get("/search")
def search(q: str, offset: int = 0, limit: int = 20):
    try:
        return run_search(q, offset, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))