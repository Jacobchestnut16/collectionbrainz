import api from "./client";

export const getLists = () => api.get("/wishlist/lists");

export const createList = (name) =>
    api.post("/wishlist/create", { name });

export const addToWishlist = (id, payload) =>
    api.post(`/wishlist/${id}/add`, payload);

export const removeFromWishlist = (id, payload) =>
    api.post(`/wishlist/${id}/remove`, payload);

export const getWishlistItems = (id) =>
    api.get(`/wishlist/${id}/list`);

export const getWishlistMeta = (id) =>
    api.get(`/wishlist/${id}/meta`);

export const updateVisibility = (id, visibility) =>
    api.post(`/wishlist/${id}/visibility`, { visibility });

export const addEditor = (id, user_id) =>
    api.post(`/wishlist/${id}/add-editor`, { user_id });

export const removeEditor = (id, user_id) =>
    api.post(`/wishlist/${id}/remove-editor`, { user_id });