import { useEffect, useState } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import axios from "axios";
import AlbumSection from "../components/AlbumSection";
import { getCover } from "../utils/getCover";

export default function ArtistPage() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();

    const [artist, setArtist] = useState(null);
    const [selectedRelease, setSelectedRelease] = useState(null);
    const [tracks, setTracks] = useState([]);

    const [loadedId, setLoadedId] = useState(null);

    // ✅ NEW: support BOTH
    const rgFromUrl = searchParams.get("rg");
    const releaseFromUrl = searchParams.get("release");

    /* ---------- helpers ---------- */

    const getArtistImage = (id) =>
        `https://coverartarchive.org/artist/${id}/front-500`;

    const handleSelect = (item) => {
        setSelectedRelease((prev) =>
            prev?.id === item.id ? null : item
        );
    };

    /* ---------- fetch artist ---------- */

    useEffect(() => {
        if (!id || id === loadedId) return;

        setLoadedId(id);

        const fetchArtist = async () => {
            const res = await axios.get(
                `http://127.0.0.1:8000/id/artist/${id}`
            );
            setArtist(res.data);
        };

        fetchArtist();
    }, [id]);

    /* ---------- URL selection (FIXED) ---------- */

    useEffect(() => {
        if (!artist) return;

        const allReleases = [
            ...artist.releases.albums,
            ...artist.releases.eps,
            ...artist.releases.singles,
            ...artist.releases.other,
        ];

        let match = null;

        // ✅ PRIMARY: release-group match
        if (rgFromUrl) {
            match = allReleases.find((r) => r.id === rgFromUrl);
        }

        // ✅ FALLBACK: release match
        if (!match && releaseFromUrl) {
            match = allReleases.find(
                (r) => r.release_id === releaseFromUrl
            );
        }

        if (match) {
            setSelectedRelease(match);
        }
    }, [artist, rgFromUrl, releaseFromUrl]);

    /* ---------- fetch tracks ---------- */

    useEffect(() => {
        if (!selectedRelease) {
            setTracks([]);
            return;
        }

        const fetchTracks = async () => {
            const res = await axios.get(
                `http://127.0.0.1:8000/id/release/${selectedRelease.release_id}`
            );

            const media = res.data.media || [];
            const allTracks = media.flatMap((m) => m.tracks || []);
            setTracks(allTracks);
        };

        fetchTracks();
    }, [selectedRelease]);

    /* ---------- scroll to selected ---------- */

    useEffect(() => {
        if (!selectedRelease) return;

        const el = document.querySelector(".card.active");
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, [selectedRelease]);

    /* ---------- render ---------- */

    if (!artist) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            {/* Artist header */}
            <div className="artist-header">
                <img src={getArtistImage(artist.id)} alt="" />
                <h1>{artist.name}</h1>
            </div>

            {/* Albums */}
            <AlbumSection
                title="Albums"
                items={artist.releases.albums}
                variant="grid"
                onItemClick={handleSelect}
                selectedId={selectedRelease?.id}
                tracks={tracks}
                selectedRelease={selectedRelease}
                getCover={getCover}
                getTitle={(r) => r.title || "Unknown"}
                getSub={(r) => r.date || ""}
            />

            {/* EPs */}
            <AlbumSection
                title="EP's"
                items={artist.releases.eps}
                variant="grid"
                onItemClick={handleSelect}
                selectedId={selectedRelease?.id}
                tracks={tracks}
                selectedRelease={selectedRelease}
                getCover={getCover}
                getTitle={(r) => r.title || "Unknown"}
                getSub={(r) => r.date || ""}
            />

            {/* Singles */}
            <AlbumSection
                title="Singles"
                items={artist.releases.singles}
                variant="grid"
                onItemClick={handleSelect}
                selectedId={selectedRelease?.id}
                tracks={tracks}
                selectedRelease={selectedRelease}
                getCover={getCover}
                getTitle={(r) => r.title || "Unknown"}
                getSub={(r) => r.date || ""}
            />

            {/* Other */}
            <AlbumSection
                title="Other"
                items={artist.releases.other}
                variant="grid"
                onItemClick={handleSelect}
                selectedId={selectedRelease?.id}
                tracks={tracks}
                selectedRelease={selectedRelease}
                getCover={getCover}
                getTitle={(r) => r.title || "Unknown"}
                getSub={(r) => r.date || ""}
            />
        </div>
    );
}