import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { search } from "../api/client";
import { getCover } from "../utils/getCover";

export default function Search() {
    const [params, setParams] = useSearchParams();

    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [input, setInput] = useState("");

    const observer = useRef();
    const navigate = useNavigate();

    const query = params.get("q") || "";
    const filter = params.get("type") || "all";

    /* ---------- sync input ---------- */
    useEffect(() => {
        setInput(query);
    }, [query]);

    /* ---------- search trigger ---------- */
    useEffect(() => {
        if (!query) return;

        setResults([]);
        setOffset(0);
        setHasMore(true);

        fetchResults(0, false);
    }, [query]);

    async function runSearch(e) {
        e.preventDefault();
        const form = new FormData(e.target);
        const q = form.get("q");

        setParams({ q, type: filter });
    }

    async function fetchResults(newOffset = 0, append = false) {
        if (loading) return;

        setLoading(true);

        try {
            const data = await search(query, newOffset);

            if (append) {
                setResults(prev => [...prev, ...data.results]);
            } else {
                setResults(data.results);
            }

            setOffset(data.offset + data.limit);
            setHasMore(data.offset + data.limit < data.total);
        } catch (err) {
            console.error("Search failed:", err);
        }

        setLoading(false);
    }

    /* ---------- infinite scroll ---------- */
    const lastItemRef = (node) => {
        if (loading || !hasMore) return;

        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                fetchResults(offset, true);
            }
        });

        if (node) observer.current.observe(node);
    };

    /* ---------- filtering ---------- */
    const filteredResults = results.filter(item => {
        if (filter === "all") return true;
        return item.type === filter;
    });

    /* ---------- helpers ---------- */
    function getTitle(item) {
        return item.title || item.name || "Unknown";
    }

    function getArtist(item) {
        return item.artist || "Unknown";
    }

    function getAlbum(item) {
        return item.album || null;
    }

    function normalizeType(type) {
        if (type === "recording") return "song";
        if (type === "release") return "album";
        return type;
    }

    /* ---------- navigation ---------- */
    function handleClick(item) {
        if (item.type === "artist") {
            navigate(`/artist/${item.id}`);
            return;
        }

        // ALBUM (release)
        if (item.type === "release") {
            if (!item.artist_id) return;

            const rg = item.release_group_id || item.id;

            navigate(`/artist/${item.artist_id}?rg=${rg}`);
            return;
        }

        // SONG (recording)
        if (item.type === "recording") {
            if (!item.artist_id) return;

            const rg = item.release_group_id;

            if (rg) {
                navigate(`/artist/${item.artist_id}?rg=${rg}`);
            } else if (item.release_id) {
                // fallback if missing
                navigate(
                    `/artist/${item.artist_id}?release=${item.release_id}`
                );
            }
        }
    }

    /* ---------- render ---------- */
    return (
        <div>
            <h1>Search</h1>

            <form onSubmit={runSearch}>
                <input
                    name="q"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Search..."
                />
                <button type="submit">Search</button>
            </form>

            {/* FILTERS */}
            <div className="filters">
                {[
                    { key: "all", label: "All" },
                    { key: "recording", label: "Songs" },
                    { key: "release", label: "Albums" },
                    { key: "artist", label: "Artists" },
                    { key: "brainz-person", label: "People" },
                ].map(f => (
                    <button
                        key={f.key}
                        onClick={() =>
                            setParams({ q: query, type: f.key })
                        }
                        className={filter === f.key ? "active" : ""}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {loading && results.length === 0 && <div>Loading...</div>}

            <div className="section">
                <div className="list">
                    {filteredResults.map((item, i) => {
                        const isLast =
                            i === filteredResults.length - 1;

                        const cover = getCover(item); // ✅ unified usage
                        const title = getTitle(item);
                        const artist = getArtist(item);
                        const album = getAlbum(item);

                        return (
                            <div
                                key={item.id + i}
                                ref={isLast ? lastItemRef : null}
                                className="list-item"
                                onClick={() => handleClick(item)}
                            >
                                {cover && (
                                    <img
                                        src={cover}
                                        alt=""
                                        referrerPolicy="no-referrer"
                                        onError={(e) =>
                                            (e.target.style.display = "none")
                                        }
                                    />
                                )}

                                <div>
                                    <div className="card-title">
                                        {title}
                                    </div>

                                    <div className="card-sub">
                                        {artist}
                                        {album && ` • ${album}`}
                                        {item.type &&
                                            ` • ${normalizeType(
                                                item.type
                                            )}`}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {loading && results.length > 0 && (
                <div>Loading more...</div>
            )}
        </div>
    );
}