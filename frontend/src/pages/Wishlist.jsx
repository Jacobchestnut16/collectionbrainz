import { useEffect, useState } from "react";
import axios from "axios";
import AlbumSection from "../components/AlbumSection";
import { getCover } from "../utils/getCover";

export default function WishlistPage() {
    const [lists, setLists] = useState([]);
    const [selectedList, setSelectedList] = useState(null);
    const [data, setData] = useState({ artists: [] });
    const [selectedRelease, setSelectedRelease] = useState(null);

    // NEW
    const [visibility, setVisibility] = useState("private");
    const [collaborators, setCollaborators] = useState([]);
    const [userSearch, setUserSearch] = useState("");
    const [userResults, setUserResults] = useState([]);

    const authHeader = {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("session_token")}`,
        },
    };

    /* ---------- fetch lists ---------- */
    useEffect(() => {
        const fetchLists = async () => {
            const res = await axios.get(
                "http://127.0.0.1:8000/wishlist/lists",
                authHeader
            );

            setLists(res.data || []);
            if (res.data?.length) {
                setSelectedList(res.data[0].id);
            }
        };

        fetchLists();
    }, []);

    /* ---------- fetch list items ---------- */
    useEffect(() => {
        if (!selectedList) return;

        const fetchItems = async () => {
            const res = await axios.get(
                `http://127.0.0.1:8000/wishlist/${selectedList}/list`,
                authHeader
            );

            setData(res.data || { artists: [] });
        };

        fetchItems();
    }, [selectedList]);

    /* ---------- fetch meta (visibility + editors) ---------- */
    useEffect(() => {
        if (!selectedList) return;

        const fetchMeta = async () => {
            try {
                const res = await axios.get(
                    `http://127.0.0.1:8000/wishlist/${selectedList}/meta`,
                    authHeader
                );

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
    const updateVisibility = async (v) => {
        setVisibility(v);

        await axios.post(
            `http://127.0.0.1:8000/wishlist/${selectedList}/visibility`,
            { visibility: v },
            authHeader
        );
    };

    /* ---------- search users ---------- */
    useEffect(() => {
        if (!userSearch) {
            setUserResults([]);
            return;
        }

        const delay = setTimeout(async () => {
            const res = await axios.get(
                `http://127.0.0.1:8000/users/search?q=${userSearch}`,
                authHeader
            );

            setUserResults(res.data || []);
        }, 300);

        return () => clearTimeout(delay);
    }, [userSearch]);

    /* ---------- add collaborator ---------- */
    const addCollaborator = async (id) => {
        await axios.post(
            `http://127.0.0.1:8000/wishlist/${selectedList}/add-editor`,
            { user_id: id },
            authHeader
        );

        setCollaborators((prev) => [...prev, { id }]);
        setUserSearch("");
        setUserResults([]);
    };

    /* ---------- remove collaborator ---------- */
    const removeCollaborator = async (id) => {
        await axios.post(
            `http://127.0.0.1:8000/wishlist/${selectedList}/remove-editor`,
            { user_id: id },
            authHeader
        );

        setCollaborators((prev) => prev.filter((u) => u.id !== id));
    };

    return (
        <div>
            <div className="artist-header">
                <h1>Wishlists</h1>

                {/* list selector */}
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
                    {/* visibility */}
                    <div>
                        <label>Visibility: </label>
                        <select
                            value={visibility}
                            onChange={(e) => updateVisibility(e.target.value)}
                        >
                            <option value="private">Private</option>
                            <option value="friends">Friends</option>
                            <option value="public">Public</option>
                        </select>
                    </div>

                    {/* collaborators */}
                    <div style={{ marginTop: 10 }}>
                        <h3>Collaborators</h3>

                        {collaborators.map((u) => (
                            <div key={u.id}>
                                {u.username || u.id}
                                <button onClick={() => removeCollaborator(u.id)}>
                                    remove
                                </button>
                            </div>
                        ))}

                        {/* search */}
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