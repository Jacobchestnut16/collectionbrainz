export function getCover(item) {
    // BEST: release-group
    if (item?.release_group_id) {
        return `https://coverartarchive.org/release-group/${item.release_group_id}/front-250`;
    }

    // fallback: release
    if (item?.release_id) {
        return `https://coverartarchive.org/release/${item.release_id}/front-250`;
    }

    // search release result (uses id)
    if (item?.type === "release" && item?.id) {
        return `https://coverartarchive.org/release/${item.id}/front-250`;
    }

    // recording fallback
    if (item?.type === "recording" && item?.release_id) {
        return `https://coverartarchive.org/release/${item.release_id}/front-250`;
    }

    // artist
    if (item?.type === "artist" && item?.id) {
        return `https://coverartarchive.org/artist/${item.id}/front-250`;
    }

    return null;
}