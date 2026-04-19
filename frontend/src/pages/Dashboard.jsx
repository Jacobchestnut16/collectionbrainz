import { useEffect, useState } from "react";
import axios from "axios";

export default function Dashboard() {
    const [listens, setListens] = useState([]);
    const [sitewideAlbums, setSitewideAlbums] = useState([]);
    const [freshReleases, setFreshReleases] = useState([]);
    const [topReleases, setTopReleases] = useState([]);
    const [topSongsListened, setTopSongsListened] = useState([]);
    const [user, setUser] = useState(null);
    const token = localStorage.getItem("session_token");


    useEffect(() => {
        const fetchUser = async () => {
            if (!token) return;

            const res = await axios.get("http://127.0.0.1:8000/me", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setUser(res.data);
        };

        fetchUser();

        const fetchListens = async () => {
            const res = await axios.get(
                `https://api.listenbrainz.org/1/user/${user?.mb_username}/listens`
            );
            setListens(res.data.payload.listens.slice(0, 10));
        };

        const fetchSitewideAlbums = async () => {
            const res = await axios.get(
                `https://api.listenbrainz.org/1/stats/sitewide/releases`
            );
            setSitewideAlbums(res.data.payload.releases.slice(0, 20));
        };

        const fetchFreshReleases = async () => {
            const res = await axios.get(
                `https://api.listenbrainz.org/1/explore/fresh-releases/`
            );
            setFreshReleases(res.data.payload.releases.slice(0, 10));
        };

        const fetchTopSongsListened = async () => {
            const res = await axios.get(
                `https://api.listenbrainz.org/1/stats/user/${user?.mb_username}/releases`
            );
            setTopSongsListened(res.data.payload.releases.slice(0, 10));
        };

        fetchListens();
        fetchSitewideAlbums();
        fetchTopSongsListened();
        fetchFreshReleases();
    }, [user]);

    function getCoverArtUrl(listen) {
        let release_mbid =
            listen.track_metadata?.mbid_mapping?.release_mbid;

        if (!release_mbid){
            release_mbid = listen.release_mbid;
            if (!release_mbid) return null;
        }
        return `https://coverartarchive.org/release/${release_mbid}/front-250`;
    }

    function AlbumSection({ title, items = [], variant }) {
        return (
            <div className="section">
                <h2>{title}</h2>

                <div className={variant}>
                    {items.map((item, i) => {
                        const cover = getCoverArtUrl(item);

                        if (variant === "chart") {
                            return (
                                <div key={i} className="chart-item">
                                    <div className="chart-rank">{i + 1}</div>

                                    {cover && <img src={cover} alt="" />}

                                    <div>
                                        <div className="card-title">
                                            {item.name ||
                                                item.release_name ||
                                                item.track_metadata?.track_name ||
                                                "Unknown"}
                                        </div>

                                        <div className="card-sub">
                                            {item.artist ||
                                                item.artist_name ||
                                                item.track_metadata?.artist_name ||
                                                item.artist_credit_name ||
                                                "Unknown"}
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        // existing layouts
                        return (
                            <div key={i} className={variant === "list" ? "list-item" : "card"}>
                                {cover && <img src={cover} alt="" />}

                                <div className={variant === "list" ? "" : "card-body"}>
                                    <div className="card-title">
                                        {item.name ||
                                            item.release_name ||
                                            item.track_metadata?.track_name ||
                                            "Unknown"}
                                    </div>

                                    <div className="card-sub">
                                        {item.artist ||
                                            item.artist_name ||
                                            item.track_metadata?.artist_name ||
                                            item.artist_credit_name ||
                                            "Unknown"}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div>

            {/*list row grid chart*/}

            <AlbumSection
                title="Your Top Songs"
                items={topSongsListened}
                variant="chart"
            />

            <AlbumSection
                title="Popular Albums Now"
                items={sitewideAlbums}
                variant="row"
            />

            <AlbumSection
                title="New Releases"
                items={freshReleases}
                variant="row"
            />

            <AlbumSection
                title="History"
                items={listens}
                variant="list"
            />

        </div>
    );
}