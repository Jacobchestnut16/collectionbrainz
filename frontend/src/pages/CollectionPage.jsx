import { useEffect, useState } from "react";
import AlbumSection from "../components/AlbumSection";
import { getCover } from "../utils/getCover";

import { getCollection } from "../api/collection";

export default function CollectionPage() {
    const [data, setData] = useState({ artists: [] });
    const [selectedRelease, setSelectedRelease] = useState(null);

    /* ---------- fetch collection ---------- */
    useEffect(() => {
        const fetchCollection = async () => {
            try {
                const res = await getCollection();
                setData(res.data || { artists: [] });
            } catch {
                setData({ artists: [] });
            }
        };

        fetchCollection();
    }, []);

    return (
        <div>
            <div className="artist-header">
                <h1>Collection</h1>
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