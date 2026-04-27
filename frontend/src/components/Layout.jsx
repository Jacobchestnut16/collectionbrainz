import { Outlet, Link, useNavigate } from "react-router-dom";
import {useEffect, useState} from "react";
import axios from "axios";
import {Navigate} from "react-router-dom";

export default function Layout() {
    const [q, setQ] = useState("");
    const navigate = useNavigate();
    const token = localStorage.getItem("session_token");
    const [user, setUser] = useState(null);


    useEffect(() => {

        axios
            .get("http://127.0.0.1:8000/me", {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(res => setUser(res.data));

    }, [token]);

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