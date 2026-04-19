import { Outlet, Link, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Layout() {
    const [q, setQ] = useState("");
    const navigate = useNavigate();

    function handleSubmit(e) {
        e.preventDefault();
        if (!q.trim()) return;

        navigate(`/search?q=${encodeURIComponent(q)}&type=artist`);
    }

    return (
        <div>
            <nav style={{ display: "flex", gap: "15px", padding: "10px" }}>
                <Link to="/app">Dashboard</Link>

                <form onSubmit={handleSubmit}>
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search..."
                    />
                </form>
            </nav>

            {/* This is where pages render */}
            <Outlet />
        </div>
    );
}