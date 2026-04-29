import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Viewpoint from "../components/ViewPoint.jsx";
import { getCover } from "../utils/getCover";
import { useAuth } from "../hooks/useAuth";

import {
    getSitewide,
    getFresh,
    getUserTop,
    getUserHistory
} from "../api/dashboard";

export default function Dashboard() {
    const [listens, setListens] = useState([]);
    const [sitewideAlbums, setSitewideAlbums] = useState([]);
    const [freshReleases, setFreshReleases] = useState([]);
    const [topAlbums, setTopAlbums] = useState([]);

    const { user, isAuthed } = useAuth();
    const navigate = useNavigate();

    /* ---------- public data ---------- */
    useEffect(() => {
        getSitewide().then(res =>
            setSitewideAlbums(res.data.payload.releases.slice(0, 20))
        );

        getFresh().then(res =>
            setFreshReleases(res.data.payload.releases.slice(0, 10))
        );
    }, []);

    /* ---------- user data ---------- */
    useEffect(() => {
        if (!isAuthed || !user?.mb_username) return;

        getUserTop(user.mb_username).then(res =>
            setTopAlbums(res.data.payload.releases.slice(0, 10))
        );

        getUserHistory(user.mb_username).then(res =>
            setListens(res.data.payload.listens.slice(0, 10))
        );
    }, [user, isAuthed]);

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
            {isAuthed && (
                <Viewpoint
                    title="Your Top Albums"
                    items={topAlbums}
                    onItemClick={handleClick}
                    getCover={getCover}
                    getTitle={(i) => i.title}
                    getSub={(i) => i.artist}
                    variant="chart"
                />
            )}

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

            {isAuthed && (
                <Viewpoint
                    title="History"
                    items={listens}
                    onItemClick={handleClick}
                    getCover={getCover}
                    getTitle={(i) => i.title}
                    getSub={(i) => i.artist}
                    variant="list"
                />
            )}
        </div>
    );
}