import axios from "axios";

const api = axios.create({
    baseURL: "http://127.0.0.1:8000",
});

export const search = async (query, offset = 0) => {
    const res = await api.get("/search", {
        params: { q: query, offset, limit: 20 }
    });
    return res.data;
};

export default api;