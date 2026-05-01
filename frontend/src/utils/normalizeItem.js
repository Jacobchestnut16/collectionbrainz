export function normalizeItem(item) {
    // if (!item) return null;
    //
    // // already normalized
    // if (item.type && item.id) return item;
    //
    // // release (album/ep/single)
    // if (item.release_id || item.release_group_id) {
    //     return {
    //         ...item,
    //         type: "release",
    //         id: item.release_group_id || item.release_id
    //     };
    // }
    //
    // // artist
    // if (item.artist_id && !item.release_id) {
    //     return {
    //         ...item,
    //         type: "artist",
    //         id: item.artist_id
    //     };
    // }
    //
    // // recording (FIXED)
    // if (item.id) {
    //     return {
    //         ...item,
    //         type: "recording",
    //         id: item.id
    //     };
    // }
    //
    // // HARD FAIL (prevents silent bad requests)
    // console.error("normalizeItem failed:", item);
    return null;
}