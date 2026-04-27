import axios from "axios";

const api = axios.create({
    baseURL: "http://127.0.0.1:8000",
});

export const validate = async (token) => {
    try {
        const res = await api.get("/me", {
            headers: { Authorization: `Bearer ${token}` }
        });

        return res.data; // or true if you just need validation
    } catch (err) {
        if (err.response?.status === 401) {
            return null;
        }
        throw err; // rethrow other errors
    }
};

export default api;