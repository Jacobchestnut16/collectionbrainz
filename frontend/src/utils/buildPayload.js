export function buildPayload(item) {
    // normalize type
    let type = item.type;

    if (type === "recording") type = "song";
    if (type === "release") type = "album";

    // pick correct id
    let id = item.id;

    if (type === "song") {
        id = item.id; // recording MBID
    }

    if (type === "album") {
        id = item.release_id || item.id; // IMPORTANT
    }

    if (type === "artist") {
        id = item.id;
    }

    return {
        type,
        id,
        meta: {
            title: item.title,
            artist: item.artist,
            artist_id: item.artist_id,
            release: item.album,
            release_id: item.release_id,
            release_group_id: item.release_group_id
        }
    };
}