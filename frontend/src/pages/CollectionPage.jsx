import { useEffect, useState } from "react";
import AlbumSection from "../components/AlbumSection";
import { getCover } from "../utils/getCover";
import { getCollection } from "../api/collection";

export default function CollectionPage() {
    const [data, setItems] = useState(null);

    useEffect(() => {
        const fetchCollection = async () => {
            const res = await getCollection();
            setItems(res.data);
        };

        fetchCollection();
    }, []);

    const [selectedRelease, setSelectedRelease] = useState(null);

    const handleSelect = (item) => {
        setSelectedRelease((prev) =>
            prev?.id === item.id ? null : item
        );
    };

    if (!data || !data.artists) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <div className="artist-header">
                <h1>Your Collection</h1>
            </div>


            {data.artists.map((artist) => (
                <AlbumSection
                    key={artist.artist_id}
                    title={artist.artist_name}
                    items={artist.releases}
                    variant="grid"
                    onItemClick={handleSelect}
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