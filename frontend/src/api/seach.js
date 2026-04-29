import api from "./client";

export const search = (q, offset = 0) =>
    api.get("/search", {
        params: { q, offset, limit: 20 }
    }).then(res => res.data);