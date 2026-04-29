import { useEffect, useState } from "react";
import { getMe } from "../api/auth";

export function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await getMe();
                setUser(res.data);
            } catch {
                setUser(null);
            } finally {
                setLoading(false);
            }
        }

        load();
    }, []);

    return { user, loading, isAuthed: !!user };
}