from fastapi import APIRouter
from services.wishlist_service import add_item, remove_item, get_items

router = APIRouter()

@router.post("/wishlist/add")
def add(payload: dict):
    return add_item(**payload)

@router.post("/wishlist/remove")
def remove(payload: dict):
    return remove_item(**payload)

@router.get("/wishlist")
def list_items(user_id: int, list_name: str):
    return get_items(user_id, list_name)