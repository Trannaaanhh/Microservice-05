import threading

_LOCK = threading.Lock()
_REQUESTS_TOTAL = 0
_STATUS_BY_CODE = {}


def record_request(status_code):
    global _REQUESTS_TOTAL
    with _LOCK:
        _REQUESTS_TOTAL += 1
        key = str(status_code)
        _STATUS_BY_CODE[key] = _STATUS_BY_CODE.get(key, 0) + 1


def snapshot():
    with _LOCK:
        return {
            'requests_total': _REQUESTS_TOTAL,
            'status_by_code': dict(_STATUS_BY_CODE),
        }
