import { useEffect, useState } from "react";
import {
    addToCollection,
    removeFromCollection,
    addToWishlist
} from "../api/library";
import { buildPayload } from "../utils/buildPayload";
import {validate} from '../api/validate_token.js'

const baseURL = "http://127.0.0.1:8000";

export default function ItemActions({ item }) {
    const payload = buildPayload(item);

    const token = localStorage.getItem("session_token");

    const [isAuthed, setIsAuthed] = useState(false);
    const [inCollection, setInCollection] = useState(false);
    const [wishlists, setWishlists] = useState([]);
    const [showPicker, setShowPicker] = useState(false);

    /* ---------- load state (ONLY if authed) ---------- */

    useEffect(() => {
        async function checkAuth() {
            if (!token) {
                setIsAuthed(false);
                return;
            }

            const result = await validate(token);
            setIsAuthed(result !== null);
        }

        checkAuth();
    }, [token]);

    useEffect(() => {
        if (!isAuthed) return;

        checkCollection();
        loadWishlists();
    }, [item.id, isAuthed]);

    /* close popout on outside click */
    useEffect(() => {
        function close() {
            setShowPicker(false);
        }

        if (showPicker) {
            window.addEventListener("click", close);
        }

        return () => {
            window.removeEventListener("click", close);
        };
    }, [showPicker]);

    async function checkCollection() {
        try {
            const res = await fetch(`${baseURL}/collection/has`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) return;

            const data = await res.json();
            setInCollection(!!data.exists);
        } catch {}
    }

    async function loadWishlists() {
        try {
            const res = await fetch(`${baseURL}/wishlist/lists`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!res.ok) {
                setWishlists([]);
                return;
            }

            const data = await res.json();
            setWishlists(Array.isArray(data) ? data : []);
        } catch {
            setWishlists([]);
        }
    }

    /* ---------- actions ---------- */

    function stop(e) {
        e.stopPropagation();
    }

    async function toggleCollection(e) {
        stop(e);
        if (!isAuthed) return;

        if (inCollection) {
            await removeFromCollection(payload);
            setInCollection(false);
        } else {
            await addToCollection(payload);
            setInCollection(true);
        }
    }

    async function handleAddToWishlist(wishlistId) {
        if (!isAuthed) return;

        await addToWishlist(wishlistId, payload);
        setShowPicker(false);
    }

    async function createWishlist() {
        if (!isAuthed) return;

        const name = prompt("New wishlist name:");
        if (!name) return;

        const res = await fetch(`${baseURL}/wishlist/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ name })
        });

        if (!res.ok) return;

        const newList = await res.json();
        setWishlists(prev => [...prev, newList]);
    }

    /* ---------- render ---------- */
    console.log("token: "+token);
    if (!isAuthed) return null;

    return (
        <div className="item-actions" onClick={stop}>
            <button onClick={toggleCollection}>
                {inCollection ? "✓" : "+"}
            </button>

            <button onClick={() => setShowPicker((v) => !v)}>
                ★
            </button>

            {showPicker && (
                <div className="wishlist-popout">
                    {wishlists.length === 0 && (
                        <div className="wishlist-empty">
                            No lists yet
                        </div>
                    )}

                    {wishlists.map((w) => (
                        <div
                            key={w.id}
                            className="wishlist-item"
                            onClick={() =>
                                handleAddToWishlist(w.id)
                            }
                        >
                            {w.name}
                        </div>
                    ))}

                    <div
                        className="wishlist-new"
                        onClick={createWishlist}
                    >
                        + New List
                    </div>
                </div>
            )}
        </div>
    );
}