export function normalizeItem(item) {
    if (!item || typeof item !== "object") {
        console.error("normalizeItem: invalid item", item);
        return null;
    }

    // normalize known types ONLY if valid
    if (item.type === "artist" && item.id) {
        return { ...item, type: "artist", id: item.id };
    }

    if (item.type === "release" && (item.release_id || item.id)) {
        return {
            ...item,
            type: "release",
            id: item.release_id || item.id
        };
    }

    if (item.type === "recording" && item.id) {
        return { ...item, type: "recording", id: item.id };
    }

    // infer release
    if (item.release_id || item.release_group_id) {
        return {
            ...item,
            type: "release",
            id: item.release_id || item.release_group_id
        };
    }

    // infer artist
    if (item.artist_id && !item.release_id) {
        return {
            ...item,
            type: "artist",
            id: item.artist_id
        };
    }

    // fallback to recording ONLY if id exists
    if (item.id) {
        return {
            ...item,
            type: "recording",
            id: item.id
        };
    }

    console.error("normalizeItem failed:", item);
    return null;
}