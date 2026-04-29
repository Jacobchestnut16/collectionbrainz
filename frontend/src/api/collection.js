import api from "./client";

export const addToCollection = (payload) =>
    api.post("/collection/add", payload);

export const removeFromCollection = (payload) =>
    api.post("/collection/remove", payload);

export const hasInCollection = (payload) =>
    api.post("/collection/has", payload);

export const getCollection = () =>
    api.get("/collection/list");