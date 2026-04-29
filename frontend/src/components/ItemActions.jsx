import { useEffect, useState } from "react";
import {
    addToCollection,
    removeFromCollection,
    hasInCollection
} from "../api/collection";
import {
    getLists,
    addToWishlist,
    createList
} from "../api/wishlist";
import { buildPayload } from "../utils/buildPayload";
import { useAuth } from "../hooks/useAuth";
import { normalizeItem } from "../utils/normalizeItem";

export default function ItemActions({ item }) {
    const normalized = normalizeItem(item);
    const payload = buildPayload(normalized);
    const { isAuthed } = useAuth();

    const [inCollection, setInCollection] = useState(false);
    const [wishlists, setWishlists] = useState([]);
    const [showPicker, setShowPicker] = useState(false);

    /* ---------- helpers ---------- */
    function stop(e) {
        e.stopPropagation();
    }

    /* ---------- load ---------- */
    useEffect(() => {
        if (!isAuthed) return;

        hasInCollection(payload)
            .then(res => setInCollection(!!res.data.exists))
            .catch(() => setInCollection(false));

    }, [item.id, isAuthed]);

    // load wishlists ONLY once when authed
    useEffect(() => {
        if (!isAuthed) return;

        getLists()
            .then(res => setWishlists(res.data || []))
            .catch(() => setWishlists([]));

    }, [isAuthed]);

    /* ---------- close popout ---------- */
    useEffect(() => {
        if (!showPicker) return;

        const close = () => setShowPicker(false);
        window.addEventListener("click", close);

        return () => window.removeEventListener("click", close);
    }, [showPicker]);

    /* ---------- actions ---------- */

    async function toggleCollection(e) {
        stop(e);

        if (inCollection) {
            await removeFromCollection(payload);
            setInCollection(false);
        } else {
            await addToCollection(payload);
            setInCollection(true);
        }
    }

    async function handleAddToWishlist(id) {
        await addToWishlist(id, payload);
        setShowPicker(false);
    }

    async function handleCreate() {
        const name = prompt("New wishlist name:");
        if (!name) return;

        const res = await createList(name);
        setWishlists(prev => [...prev, res.data]);
    }

    if (!isAuthed) return null;

    return (
        <div className="item-actions" onClick={stop}>
            <button onClick={toggleCollection}>
                {inCollection ? "✓" : "+"}
            </button>

            <button onClick={(e) => {
                stop(e);
                setShowPicker(v => !v);
            }}>
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
                            onClick={() => handleAddToWishlist(w.id)}
                        >
                            {w.name}
                        </div>
                    ))}

                    <div
                        className="wishlist-new"
                        onClick={handleCreate}
                    >
                        + New List
                    </div>
                </div>
            )}
        </div>
    );
}