// utils/normalizeItem.js
export function normalizeItem(item) {
    // already normalized
    if (item.type) return item;

    // collection / wishlist / dashboard releases
    if (item.release_id || item.release_group_id) {
        return {
            ...item,
            type: "release",
            id: item.release_group_id || item.release_id
        };
    }

    // artist fallback
    if (item.artist_id && !item.release_id) {
        return {
            ...item,
            type: "artist",
            id: item.artist_id
        };
    }

    // recording fallback
    return {
        ...item,
        type: "recording"
    };
}