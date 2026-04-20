import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { search } from "../api/client";

export default function Search() {
    const [params, setParams] = useSearchParams();

    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [input, setInput] = useState("");

    const observer = useRef();

    const query = params.get("q") || "";
    const filter = params.get("type") || "all";

    // sync input with URL
    useEffect(() => {
        setInput(query);
    }, [query]);

    // run search when query changes
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

        const data = await search(query, newOffset);

        if (append) {
            setResults(prev => [...prev, ...data.results]);
        } else {
            setResults(data.results);
        }

        setOffset(data.offset + data.limit);
        setHasMore(data.offset + data.limit < data.total);

        setLoading(false);
    }

    // infinite scroll trigger
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

    // filtering layer
    const filteredResults = results.filter(item => {
        if (filter === "all") return true;
        if (filter === "recording") return item.type === "recording";
        if (filter === "release") return item.type === "release";
        if (filter === "artist") return item.type === "artist";
        if (filter === "brainz-person") return item.type === "brainz-person";
        return true;
    });

    // unified helpers
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

    function getCover(item) {
        if (item.type === "release" && item.id) {
            return `https://coverartarchive.org/release/${item.id}/front-250`;
        }

        if (item.type === "recording" && item.release_id) {
            return `https://coverartarchive.org/release/${item.release_id}/front-250`;
        }

        if (item.type === "artist" && item.id) {
            return `https://coverartarchive.org/artist/${item.id}/front-250`;
        }

        if (item.type === "brainz-person") {
            return "/default-avatar.png";
        }

        return null;
    }

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
                        const isLast = i === filteredResults.length - 1;

                        const cover = getCover(item);
                        const title = getTitle(item);
                        const artist = getArtist(item);
                        const album = getAlbum(item);

                        return (
                            <div
                                key={item.id + i}
                                ref={isLast ? lastItemRef : null}
                                className="list-item"
                            >
                                {cover && <img src={cover} alt="" />}

                                <div>
                                    <div className="card-title">
                                        {title}
                                    </div>

                                    <div className="card-sub">
                                        {artist}
                                        {album && ` • ${album}`}
                                        {item.type &&
                                            ` • ${normalizeType(item.type)}`}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {loading && results.length > 0 && <div>Loading more...</div>}
        </div>
    );
}