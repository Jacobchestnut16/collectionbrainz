import { useEffect, useRef, useState } from "react";
import ItemActions from "../components/ItemActions";

function getColumnCount(containerWidth, minCardWidth = 140, gap = 16) {
    if (!containerWidth) return 1;

    return Math.max(
        1,
        Math.floor((containerWidth + gap) / (minCardWidth + gap))
    );
}

export default function Viewpoint({
                                      title,
                                      items = [],
                                      variant = "grid",
                                      onItemClick,
                                      selectedId,
                                      tracks = [],
                                      selectedRelease,
                                      getCover,
                                      getTitle,
                                      getSub,
                                  }) {
    const containerRef = useRef(null);
    const [columns, setColumns] = useState(3);

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            const width = entries[0].contentRect.width;
            setColumns(getColumnCount(width));
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const isGrid = variant === "grid";
    const isList = variant === "list";
    const isChart = variant === "chart";

    return (
        <div className="section" ref={containerRef}>
            <h2>{title}</h2>

            {/* LIST */}
            {isList && (
                <div className="list">
                    {items.map((item) => {
                        const isSelected = item.id === selectedId;
                        const cover = getCover?.(item);

                        return (
                            <div
                                key={item.id}
                                className={`list-item ${isSelected ? "active" : ""}`}
                                onClick={() => onItemClick?.(item)}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                    {cover && (
                                        <img
                                            src={cover}
                                            alt=""
                                            referrerPolicy="no-referrer"
                                            onError={(e) => (e.target.style.display = "none")}
                                        />
                                    )}

                                    <div>
                                        <div className="card-title">
                                            {getTitle?.(item) ?? "Unknown"}
                                        </div>

                                        <div className="card-sub">
                                            {getSub?.(item) ?? ""}
                                        </div>
                                    </div>
                                </div>

                                <ItemActions item={item} />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* GRID */}
            {isGrid && (
                <div className="grid">
                    {items.map((item) => {
                        const isSelected = item.id === selectedId;
                        const cover = getCover?.(item);

                        return (
                            <div
                                key={item.id}
                                className={`card ${isSelected ? "active" : ""}`}
                                onClick={() => onItemClick?.(item)}
                            >
                                {cover && <img src={cover} alt="" />}

                                <div className="card-body">
                                    <div className="card-title">
                                        {getTitle?.(item) ?? "Unknown"}
                                    </div>

                                    <div className="card-sub">
                                        {getSub?.(item) ?? ""}
                                    </div>

                                    <ItemActions item={item} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* CHART */}
            {isChart && (
                <div className="chart">
                    {items.map((item, i) => {
                        const isSelected = item.id === selectedId;
                        const cover = getCover?.(item);

                        return (
                            <div
                                key={item.id}
                                className={`chart-item ${isSelected ? "active" : ""}`}
                                onClick={() => onItemClick?.(item)}
                            >
                                <div className="chart-rank">{i + 1}</div>

                                {cover && <img src={cover} alt="" />}

                                <div>
                                    <div className="card-title">
                                        {getTitle?.(item) ?? "Unknown"}
                                    </div>

                                    <div className="card-sub">
                                        {getSub?.(item) ?? ""}
                                    </div>
                                </div>

                                <ItemActions item={item} />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* EXPANDED */}
            {isGrid && selectedId && selectedRelease && (
                <div className="expanded-row">
                    <h3>Tracks — {selectedRelease.title}</h3>

                    <div className="chart">
                        {tracks.map((t, i) => (
                            <div key={i} className="chart-item">
                                <div className="chart-rank">{i + 1}</div>

                                <div>
                                    <div className="card-title">{t.title}</div>

                                    <div className="card-sub">
                                        {t.length
                                            ? `${Math.floor(t.length / 60000)}:${String(
                                                Math.floor((t.length % 60000) / 1000)
                                            ).padStart(2, "0")}`
                                            : ""}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}