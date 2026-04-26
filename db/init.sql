BEGIN;

-- --------------------------------------------------
-- VISIBILITY TYPE (3 states)
-- --------------------------------------------------
CREATE TYPE visibility_level AS ENUM ('private', 'friends', 'public');

-- --------------------------------------------------
-- USERS
-- --------------------------------------------------
CREATE TABLE users (
    id SERIAL PRIMARY KEY,

    mb_user_id TEXT UNIQUE,
    mb_username TEXT UNIQUE NOT NULL,
    mb_profile_url TEXT,
    mb_email TEXT,

    lb_user_token TEXT,

    collection_visibility visibility_level NOT NULL DEFAULT 'private',

    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

-- --------------------------------------------------
-- FRIENDS (needed for "friends" visibility)
-- --------------------------------------------------
CREATE TABLE user_friends (
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    created_at TIMESTAMP DEFAULT NOW(),

    PRIMARY KEY (user_id, friend_id),
    CHECK (user_id <> friend_id)
);

CREATE INDEX idx_user_friends_friend ON user_friends(friend_id);

-- --------------------------------------------------
-- RECORDINGS (single source of truth)
-- --------------------------------------------------
CREATE TABLE recordings (
    id SERIAL PRIMARY KEY,

    mbid TEXT UNIQUE,
    msid TEXT UNIQUE,

    title TEXT,
    artist_name TEXT,
    artist_id TEXT,

    release_name TEXT,
    release_id TEXT,
    release_group_id TEXT,

    image_url TEXT,

    last_updated TIMESTAMP DEFAULT NOW(),

    CHECK (mbid IS NOT NULL OR msid IS NOT NULL)
);

CREATE INDEX idx_recordings_mbid ON recordings(mbid);
CREATE INDEX idx_recordings_msid ON recordings(msid);

-- --------------------------------------------------
-- COLLECTION
-- --------------------------------------------------
CREATE TABLE collection (
    id SERIAL PRIMARY KEY,

    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recording_id INT NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,

    date_collected TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, recording_id)
);

CREATE INDEX idx_collection_user ON collection(user_id);

-- --------------------------------------------------
-- WISHLISTS
-- --------------------------------------------------
CREATE TABLE wishlists (
    id SERIAL PRIMARY KEY,

    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,

    visibility visibility_level NOT NULL DEFAULT 'private',

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, name)
);

CREATE INDEX idx_wishlists_user ON wishlists(user_id);

-- --------------------------------------------------
-- WISHLIST ITEMS
-- --------------------------------------------------
CREATE TABLE wishlist_items (
    id SERIAL PRIMARY KEY,

    wishlist_id INT NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    recording_id INT NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,

    date_added TIMESTAMP DEFAULT NOW(),

    UNIQUE(wishlist_id, recording_id)
);

-- --------------------------------------------------
-- WISHLIST EDITORS (collaboration)
-- --------------------------------------------------
CREATE TABLE wishlist_editors (
    id SERIAL PRIMARY KEY,

    wishlist_id INT NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    can_edit BOOLEAN DEFAULT TRUE,
    added_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(wishlist_id, user_id)
);

CREATE INDEX idx_wishlist_editors_user ON wishlist_editors(user_id);

-- Prevent owner being added as editor
CREATE OR REPLACE FUNCTION prevent_owner_as_editor()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM wishlists w
        WHERE w.id = NEW.wishlist_id
        AND w.user_id = NEW.user_id
    ) THEN
        RAISE EXCEPTION 'Owner already has full control';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_owner_editor
BEFORE INSERT ON wishlist_editors
FOR EACH ROW
EXECUTE FUNCTION prevent_owner_as_editor();

-- --------------------------------------------------
-- SESSIONS
-- --------------------------------------------------
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    access_token TEXT,
    refresh_token TEXT,

    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);

COMMIT;
