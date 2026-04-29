import { Outlet, Link, useNavigate } from "react-router-dom";
import {useEffect, useState} from "react";
import { useAuth } from "../hooks/useAuth";

export default function Layout() {
    const [q, setQ] = useState("");
    const navigate = useNavigate();

    const { user } = useAuth();

    const handleSignIn = async () => {
        window.location.href = "http://127.0.0.1:8000/auth/login";
    };


    function handleSubmit(e) {
        e.preventDefault();
        if (!q.trim()) return;

        navigate(`/search?q=${encodeURIComponent(q)}&type=artist`);
    }

    return (
        <div>
            <nav style={{ display: "flex", gap: "15px", padding: "10px" }}>
                <h1><Link to="/">CollectionBrainz</Link></h1>

                { user &&<Link to="/collection">Collection</Link> }

                { user &&<Link to="/wishlist">Wishlist</Link> }

                <form onSubmit={handleSubmit}>
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search..."
                    />
                </form>

                {
                    !user &&
                <button onClick={handleSignIn}>
                    Continue with MusicBrainz
                </button>
                }

            </nav>

            {/* This is where pages render */}
            <Outlet />
        </div>
    );
}