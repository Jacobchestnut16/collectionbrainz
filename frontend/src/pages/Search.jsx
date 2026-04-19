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
        setParams({ q });
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

    function getCover(item) {
        // release cover
        if (item.type === "release" && item.id) {
            return `https://coverartarchive.org/release/${item.id}/front-250`;
        }

        // recording cover (if backend provides release_id)
        if (item.type === "recording" && item.release_id) {
            return `https://coverartarchive.org/release/${item.release_id}/front-250`;
        }

        // artist image
        if (item.type === "artist" && item.id) {
            return `https://coverartarchive.org/artist/${item.id}/front-250`;
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

            {loading && results.length === 0 && <div>Loading...</div>}

            <div className="section">
                <div className="list">
                    {results.map((item, i) => {
                        const isLast = i === results.length - 1;

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
                                        {item.type && ` • ${item.type}`}
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