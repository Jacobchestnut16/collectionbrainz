export function buildPayload(item) {
    const typeMap = {
        recording: "song",
        release: "album",
        artist: "artist"
    };

    return {
        type: typeMap[item.type] || item.type,
        id: item.id,
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