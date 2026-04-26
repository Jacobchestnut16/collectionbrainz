const baseURL = "http://127.0.0.1:8000";

export async function addToCollection(payload) {
    // return fetch("/api/collection/add", {
    return fetch(`${baseURL}/collection/add`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: localStorage.getItem("token")
        },
        body: JSON.stringify(payload)
    });
}

export async function removeFromCollection(payload) {
    // return fetch("/api/collection/remove", {
    return fetch(`${baseURL}/collection/remove`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: localStorage.getItem("token")
        },
        body: JSON.stringify(payload)
    });
}

export async function addToWishlist(wishlistId, payload) {
    // return fetch(`/api/wishlist/${wishlistId}/add`, {
    return fetch(`${baseURL}/wishlist/${wishlistId}/add`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: localStorage.getItem("token")
        },
        body: JSON.stringify(payload)
    });
}

export async function removeFromWishlist(wishlistId, payload) {
    // return fetch(`/api/wishlist/${wishlistId}/remove`, {
    return fetch(`${baseURL}/wishlist/${wishlistId}/remove`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: localStorage.getItem("token")
        },
        body: JSON.stringify(payload)
    });
}