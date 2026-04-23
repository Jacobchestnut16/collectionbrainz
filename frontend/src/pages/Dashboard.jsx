import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import Viewpoint from "../components/ViewPoint.jsx";
import { getCover } from "../utils/getCover";

export default function Dashboard() {
    const [listens, setListens] = useState([]);
    const [sitewideAlbums, setSitewideAlbums] = useState([]);
    const [freshReleases, setFreshReleases] = useState([]);
    const [topAlbums, setTopAlbums] = useState([]);
    const [user, setUser] = useState(null);

    const token = localStorage.getItem("session_token");
    const navigate = useNavigate();

    /* ---------- user ---------- */
    useEffect(() => {
        if (!token) return;

        axios
            .get("http://127.0.0.1:8000/me", {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(res => setUser(res.data));
    }, [token]);

    /* ---------- data ---------- */
    useEffect(() => {

        const base = "http://127.0.0.1:8000/dashboard";

        axios.get(`${base}/sitewide/releases`)
            .then(res => setSitewideAlbums(res.data.payload.releases.slice(0, 20)));

        axios.get(`${base}/fresh-releases`)
            .then(res => setFreshReleases(res.data.payload.releases.slice(0, 10)));

        // everything that requires a logged-in user:
        if (!user?.mb_username) return;

        axios.get(`${base}/user/top-albums/${user.mb_username}`)
            .then(res => setTopAlbums(res.data.payload.releases.slice(0, 10)));

        axios.get(`${base}/user/history/${user.mb_username}`)
            .then(res => setListens(res.data.payload.listens.slice(0, 10)));

    }, [user]);

    /* ---------- click ---------- */
    function handleClick(item) {
        const artistId = item?.artist_id;
        const rg = item?.release_group_id;
        const release = item?.release_id;

        if (!artistId) return;

        if (rg) {
            navigate(`/artist/${artistId}?rg=${rg}`);
        } else if (release) {
            navigate(`/artist/${artistId}?release=${release}`);
        }
    }

    return (
        <div>

            { user && <Viewpoint
                title="Your Top Albums"
                items={topAlbums}
                onItemClick={handleClick}
                getCover={getCover}
                getTitle={(i) => i.title}
                getSub={(i) => i.artist}
                variant="chart"
            />}

            <Viewpoint
                title="Popular Albums Now"
                items={sitewideAlbums}
                onItemClick={handleClick}
                getCover={getCover}
                getTitle={(i) => i.title}
                getSub={(i) => i.artist}
                variant="grid"
            />

            <Viewpoint
                title="New Releases"
                items={freshReleases}
                onItemClick={handleClick}
                getCover={getCover}
                getTitle={(i) => i.title}
                getSub={(i) => i.artist}
                variant="grid"
            />

            { user && <Viewpoint
                title="History"
                items={listens}
                onItemClick={handleClick}
                getCover={getCover}
                getTitle={(i) => i.title}
                getSub={(i) => i.artist}
                variant="list"
            />}

        </div>
    );
}