import { useEffect, useRef, useState } from "react";

/* ---------- helpers ---------- */

// split items into rows
function chunk(items, size) {
    const rows = [];
    for (let i = 0; i < items.length; i += size) {
        rows.push(items.slice(i, i + size));
    }
    return rows;
}

// calculate how many columns fit
function getColumnCount(containerWidth, minCardWidth = 140, gap = 16) {
    if (!containerWidth) return 1;

    return Math.max(
        1,
        Math.floor((containerWidth + gap) / (minCardWidth + gap))
    );
}

/* ---------- component ---------- */

export default function AlbumSection({
                                         title,
                                         items = [],
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

    // dynamically calculate columns based on width
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            const width = entries[0].contentRect.width;
            const cols = getColumnCount(width);
            setColumns(cols);
        });

        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, []);

    const rows = chunk(items, columns);

    return (
        <div className="section" ref={containerRef}>
            <h2>{title}</h2>

            {rows.map((row, rowIndex) => {
                const hasSelected = row.some(
                    (item) => item.id === selectedId
                );

                return (
                    <div key={rowIndex}>
                        {/* GRID ROW */}
                        <div className="grid">
                            {row.map((item) => {
                                const isSelected = item.id === selectedId;
                                const cover = getCover?.(item);

                                return (
                                    <div
                                        key={item.id}
                                        className={`card ${
                                            isSelected ? "active" : ""
                                        }`}
                                        onClick={() =>
                                            onItemClick?.(item)
                                        }
                                    >
                                        {cover && (
                                            <img src={cover} alt="" />
                                        )}

                                        <div className="card-body">
                                            <div className="card-title">
                                                {getTitle
                                                    ? getTitle(item)
                                                    : "Unknown"}
                                            </div>

                                            {/*debug ids*/}
                                            {/*<div className="card-title" style={{*/}
                                            {/*    whiteSpace: 'normal',   // Overrides 'nowrap' to allow wrapping*/}
                                            {/*    textOverflow: 'clip',   // Removes the 'ellipsis'*/}
                                            {/*    overflow: 'visible'     // Optional: ensures content isn't hidden if it overflows height*/}
                                            {/*}}>*/}
                                            {/*    {"id: "+item.id}*/}
                                            {/*</div>*/}

                                            <div className="card-sub">
                                                {getSub
                                                    ? getSub(item)
                                                    : ""}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* TRACKS INSERTED AFTER ROW */}
                        {hasSelected && selectedRelease && (
                            <div className="expanded-row">
                                <h3>
                                    Tracks — {selectedRelease.title}
                                </h3>

                                <div className="chart">
                                    {tracks.map((t, i) => (
                                        <div
                                            key={i}
                                            className="chart-item"
                                        >
                                            <div className="chart-rank">
                                                {i + 1}
                                            </div>

                                            <div>
                                                <div className="card-title">
                                                    {t.title}
                                                </div>

                                                <div className="card-sub">
                                                    {t.length
                                                        ? `${Math.floor(
                                                            t.length /
                                                            60000
                                                        )}:${String(
                                                            Math.floor(
                                                                (t.length %
                                                                    60000) /
                                                                1000
                                                            )
                                                        ).padStart(
                                                            2,
                                                            "0"
                                                        )}`
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
            })}
        </div>
    );
}