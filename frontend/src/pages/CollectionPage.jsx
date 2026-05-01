import { useEffect, useState } from "react";
import AlbumSection from "../components/AlbumSection";
import { getCover } from "../utils/getCover";

import {
    getLists,
    getWishlistItems,
    getWishlistMeta,
    updateVisibility,
    addEditor,
    removeEditor
} from "../api/wishlist";

import api from "../api/client"; // for user search only

export default function WishlistPage() {
    const [lists, setLists] = useState([]);
    const [selectedList, setSelectedList] = useState(null);
    const [data, setData] = useState({ artists: [] });
    const [selectedRelease, setSelectedRelease] = useState(null);

    const [visibility, setVisibility] = useState("private");
    const [collaborators, setCollaborators] = useState([]);
    const [userSearch, setUserSearch] = useState("");
    const [userResults, setUserResults] = useState([]);

    /* ---------- fetch lists ---------- */
    useEffect(() => {
        const fetchLists = async () => {
            const res = await getLists();

            const listsData = res.data || [];
            setLists(listsData);

            if (listsData.length) {
                setSelectedList(listsData[0].id);
            }
        };

        fetchLists();
    }, []);

    /* ---------- fetch list items ---------- */
    useEffect(() => {
        if (!selectedList) return;

        const fetchItems = async () => {
            const res = await getWishlistItems(selectedList);
            setData(res.data || { artists: [] });
        };

        fetchItems();
    }, [selectedList]);

    /* ---------- fetch meta ---------- */
    useEffect(() => {
        if (!selectedList) return;

        const fetchMeta = async () => {
            try {
                const res = await getWishlistMeta(selectedList);

                setVisibility(res.data.visibility);
                setCollaborators(res.data.editors || []);
            } catch {
                setVisibility("private");
                setCollaborators([]);
            }
        };

        fetchMeta();
    }, [selectedList]);

    /* ---------- update visibility ---------- */
    const handleVisibility = async (v) => {
        setVisibility(v);
        await updateVisibility(selectedList, v);
    };

    /* ---------- search users ---------- */
    useEffect(() => {
        if (!userSearch) {
            setUserResults([]);
            return;
        }

        const delay = setTimeout(async () => {
            const res = await api.get(`/users/search?q=${userSearch}`);
            setUserResults(res.data || []);
        }, 300);

        return () => clearTimeout(delay);
    }, [userSearch]);

    /* ---------- add collaborator ---------- */
    const handleAdd = async (id) => {
        await addEditor(selectedList, id);

        setCollaborators((prev) => [...prev, { id }]);
        setUserSearch("");
        setUserResults([]);
    };

    /* ---------- remove collaborator ---------- */
    const handleRemove = async (id) => {
        await removeEditor(selectedList, id);
        setCollaborators((prev) => prev.filter((u) => u.id !== id));
    };

    return (
        <div>
            <div className="artist-header">
                <h1>Wishlists</h1>

                <select
                    value={selectedList || ""}
                    onChange={(e) => setSelectedList(e.target.value)}
                >
                    {lists.map((l) => (
                        <option key={l.id} value={l.id}>
                            {l.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* ---------- CONTROLS ---------- */}
            {selectedList && (
                <div style={{ marginBottom: 20 }}>
                    <div>
                        <label>Visibility: </label>
                        <select
                            value={visibility}
                            onChange={(e) => handleVisibility(e.target.value)}
                        >
                            <option value="private">Private</option>
                            <option value="friends">Friends</option>
                            <option value="public">Public</option>
                        </select>
                    </div>

                    <div style={{ marginTop: 10 }}>
                        <h3>Collaborators</h3>

                        {collaborators.map((u) => (
                            <div key={u.id}>
                                {u.username || u.id}
                                <button onClick={() => handleRemove(u.id)}>
                                    remove
                                </button>
                            </div>
                        ))}

                        <input
                            placeholder="Add user..."
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                        />

                        {userResults.map((u) => (
                            <div key={u.id}>
                                {u.username}
                                <button onClick={() => handleAdd(u.id)}>
                                    add
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ---------- CONTENT ---------- */}
            {data.artists.map((artist) => (
                <AlbumSection
                    key={artist.artist_id}
                    title={artist.artist_name}
                    items={artist.releases}
                    variant="grid"
                    onItemClick={(item) =>
                        setSelectedRelease((prev) =>
                            prev?.id === item.id ? null : item
                        )
                    }
                    selectedId={selectedRelease?.id}
                    tracks={selectedRelease?.tracks || []}
                    selectedRelease={selectedRelease}
                    getCover={getCover}
                    getTitle={(r) => r.title || "Unknown"}
                    getSub={() => ""}
                />
            ))}
        </div>
    );
}