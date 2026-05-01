import functools
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



def cached(key_fn, ttl=60):
    def decorator(func):
        @functools.wraps(func)  # ✅ THIS is the fix
        def wrapper(*args, **kwargs):
            key = key_fn(*args, **kwargs)
            now = time.time()

            if key in _cache:
                value, ts = _cache[key]
                if now - ts < ttl:
                    return value

            result = func(*args, **kwargs)
            _cache[key] = (result, now)
            return result

        return wrapper
    return decorator