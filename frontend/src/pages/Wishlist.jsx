import { useEffect, useState } from "react";
import axios from "axios";
import AlbumSection from "../components/AlbumSection";
import { getCover } from "../utils/getCover";

export default function WishlistPage() {
    const [lists, setLists] = useState([]);
    const [selectedList, setSelectedList] = useState(null);
    const [data, setData] = useState({ artists: [] });
    const [selectedRelease, setSelectedRelease] = useState(null);

    /* ---------- fetch lists ---------- */

    useEffect(() => {
        const fetchLists = async () => {
            const res = await axios.get(
                "http://127.0.0.1:8000/wishlist/lists",
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("session_token")}`,
                    },
                }
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
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("session_token")}`,
                    },
                }
            );

            setData(res.data || { artists: [] });
        };

        fetchItems();
    }, [selectedList]);

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