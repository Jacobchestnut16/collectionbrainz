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

import api from "../api/client"; // ONLY for users search (no wrapper exists yet)

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
        getLists()
            .then((res) => {
                setLists(res.data || []);
                if (res.data?.length) {
                    setSelectedList(res.data[0].id);
                }
            })
            .catch(() => setLists([]));
    }, []);

    /* ---------- fetch list items ---------- */
    useEffect(() => {
        if (!selectedList) return;

        getWishlistItems(selectedList)
            .then((res) => setData(res.data || { artists: [] }))
            .catch(() => setData({ artists: [] }));
    }, [selectedList]);

    /* ---------- fetch meta ---------- */
    useEffect(() => {
        if (!selectedList) return;

        getWishlistMeta(selectedList)
            .then((res) => {
                setVisibility(res.data.visibility);
                setCollaborators(res.data.editors || []);
            })
            .catch(() => {
                setVisibility("private");
                setCollaborators([]);
            });
    }, [selectedList]);

    /* ---------- update visibility ---------- */
    const updateVis = async (v) => {
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
            const res = await api.get(
                `/users/search?q=${encodeURIComponent(userSearch)}`
            );

            setUserResults(res.data || []);
        }, 300);

        return () => clearTimeout(delay);
    }, [userSearch]);

    /* ---------- add collaborator ---------- */
    const addCollaborator = async (id) => {
        await addEditor(selectedList, id);

        setCollaborators((prev) => [...prev, { id }]);
        setUserSearch("");
        setUserResults([]);
    };

    /* ---------- remove collaborator ---------- */
    const removeCollaboratorHandler = async (id) => {
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

            {selectedList && (
                <div style={{ marginBottom: 20 }}>
                    <div>
                        <label>Visibility: </label>
                        <select
                            value={visibility}
                            onChange={(e) => updateVis(e.target.value)}
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
                                <button onClick={() => removeCollaboratorHandler(u.id)}>
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
                                <button onClick={() => addCollaborator(u.id)}>
                                    add
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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