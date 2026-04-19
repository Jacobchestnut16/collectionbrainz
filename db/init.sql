CREATE TABLE users (
    id SERIAL PRIMARY KEY,

    mb_user_id TEXT UNIQUE,
    mb_username TEXT UNIQUE NOT NULL,
    mb_profile_url TEXT,
    mb_email TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

CREATE TABLE wishlist (
    id SERIAL PRIMARY KEY,

    user_id INT NOT NULL REFERENCES users(id),

    mbid TEXT NOT NULL,

    song_title TEXT,
    album_title TEXT,
    release_artist TEXT,

    mbid_image TEXT,

    list_name TEXT,

    date_added TIMESTAMP DEFAULT NOW()
);

CREATE TABLE collection (
    id SERIAL PRIMARY KEY,

    user_id INT NOT NULL REFERENCES users(id),

    mbid TEXT NOT NULL,

    song_title TEXT,
    album_title TEXT,
    release_artist TEXT,

    mbid_image TEXT,

    date_collected TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),

    access_token TEXT,
    refresh_token TEXT,

    expires_at TIMESTAMP NOT NULL,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX uniq_wishlist_item
ON wishlist(user_id, list_name, mbid);

CREATE UNIQUE INDEX uniq_collection_item
ON collection(user_id, mbid);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);