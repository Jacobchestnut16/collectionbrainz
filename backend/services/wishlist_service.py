from services.db import query

def add_item(user_id, mbid, song_title, album_title, release_artist, mbid_image, list_name):
    return query(
        """
        INSERT INTO wishlist
        (user_id, mbid, song_title, album_title, release_artist, mbid_image, list_name)
        VALUES (%s,%s,%s,%s,%s,%s,%s)
        RETURNING *
        """,
        (user_id, mbid, song_title, album_title, release_artist, mbid_image, list_name),
        fetch=True
    )


def remove_item(user_id, mbid, list_name):
    return query(
        """
        DELETE FROM wishlist
        WHERE user_id=%s AND mbid=%s AND list_name=%s
        """,
        (user_id, mbid, list_name)
    )


def get_items(user_id, list_name):
    return query(
        """
        SELECT * FROM wishlist
        WHERE user_id=%s AND list_name=%s
        """,
        (user_id, list_name),
        fetch=True
    )

# --------------------------------------------------
# PERMISSION CHECK
# --------------------------------------------------
def can_edit_wishlist(user_id: int, wishlist_id: int):
    row = query("""
        SELECT 1
        FROM wishlists w
        LEFT JOIN wishlist_editors e
            ON e.wishlist_id = w.id
            AND e.user_id = %s
        WHERE w.id = %s
        AND (
            w.user_id = %s
            OR (e.user_id IS NOT NULL AND e.can_edit = TRUE)
        )
    """, (user_id, wishlist_id, user_id), fetch=True)

    return bool(row)

def can_view_wishlist(user_id: int, wishlist_id: int):
    row = query("""
        SELECT w.user_id, w.visibility
        FROM wishlists w
        WHERE w.id = %s
    """, (wishlist_id,), fetch=True)

    if not row:
        return False

    owner_id = row[0]["user_id"]
    visibility = row[0]["visibility"]

    # owner always allowed
    if owner_id == user_id:
        return True

    # public
    if visibility == "public":
        return True

    # friends
    if visibility == "friends":
        friend = query("""
            SELECT 1 FROM user_friends
            WHERE user_id = %s AND friend_id = %s
        """, (owner_id, user_id), fetch=True)

        return bool(friend)

    return False