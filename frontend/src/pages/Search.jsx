import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { search } from "../api/client";
import { getCover } from "../utils/getCover";
import ItemActions from "../components/ItemActions";

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

    useEffect(() => {
        setInput(query);
    }, [query]);

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
            console.error(err);
        }

        setLoading(false);
    }

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

    function handleClick(item) {
        if (item.type === "artist") {
            navigate(`/artist/${item.id}`);
            return;
        }

        if (item.type === "release") {
            if (!item.artist_id) return;
            const rg = item.release_group_id || item.id;
            navigate(`/artist/${item.artist_id}?rg=${rg}`);
            return;
        }

        if (item.type === "recording") {
            if (!item.artist_id) return;

            const rg = item.release_group_id;

            if (rg) {
                navigate(`/artist/${item.artist_id}?rg=${rg}`);
            } else if (item.release_id) {
                navigate(`/artist/${item.artist_id}?release=${item.release_id}`);
            }
        }
    }

    return (
        <div>
            <h1>Search</h1>

            <form onSubmit={runSearch}>
                <input
                    name="q"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />
                <button type="submit">Search</button>
            </form>

            <div className="section">
                <div className="list">
                    {results.map((item, i) => {
                        const isLast = i === results.length - 1;
                        const cover = getCover(item);

                        return (
                            <div
                                key={item.id + i}
                                ref={isLast ? lastItemRef : null}
                                className="list-item"
                                onClick={() => handleClick(item)}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}
                            >
                                <div style={{ display: "flex", gap: 10 }}>
                                    {cover && <img src={cover} alt="" />}

                                    <div>
                                        <div className="card-title">
                                            {item.title}
                                        </div>

                                        <div className="card-sub">
                                            {item.artist}
                                        </div>
                                    </div>
                                </div>

                                <ItemActions item={item} />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}