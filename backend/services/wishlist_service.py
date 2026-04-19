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