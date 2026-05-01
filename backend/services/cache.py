import time
import threading

_cache = {}
_lock = threading.Lock()

DEFAULT_TTL = 300  # 5 minutes


def get(key):
    with _lock:
        item = _cache.get(key)
        if not item:
            return None

        value, expires = item
        if time.time() > expires:
            del _cache[key]
            return None

        return value


def set(key, value, ttl=DEFAULT_TTL):
    with _lock:
        _cache[key] = (value, time.time() + ttl)


def cached(key_builder, ttl=DEFAULT_TTL):
    def decorator(fn):
        def wrapper(*args, **kwargs):
            key = key_builder(*args, **kwargs)

            cached_value = get(key)
            if cached_value is not None:
                return cached_value

            result = fn(*args, **kwargs)
            set(key, result, ttl)
            return result

        return wrapper
    return decorator