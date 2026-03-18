from collections import defaultdict

import requests
from rest_framework.decorators import api_view
from rest_framework.response import Response


RATING_SERVICE_URL = "http://comment-rate-service:8000/ratings/"
BOOK_SERVICE_URL = "http://book-service:8000/books/"
DEFAULT_LIMIT = 5


def _safe_get_json(url):
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            payload = response.json()
            return payload if isinstance(payload, list) else []
        return []
    except requests.RequestException:
        return []


def _to_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


@api_view(['GET'])
def get_recommendation(request, customer_id):
    limit = _to_int(request.GET.get("limit"), DEFAULT_LIMIT)
    if limit <= 0:
        limit = DEFAULT_LIMIT

    ratings = _safe_get_json(RATING_SERVICE_URL)
    books = _safe_get_json(BOOK_SERVICE_URL)

    # Fallback: if ratings service is empty/unavailable, recommend in-stock books by stock desc.
    if not ratings:
        ranked_books = [
            book
            for book in sorted(books, key=lambda b: _to_int(b.get("stock"), 0), reverse=True)
            if _to_int(book.get("stock"), 0) > 0
        ][:limit]

        detailed = [
            {
                "id": _to_int(book.get("id")),
                "title": book.get("title", ""),
                "author": book.get("author", ""),
                "price": book.get("price", 0),
                "stock": _to_int(book.get("stock"), 0),
                "image_url": book.get("image_url", ""),
                "avg_rating": None,
            }
            for book in ranked_books
        ]
        return Response(
            {
                "customer_id": _to_int(customer_id),
                "recommended_books": [item["id"] for item in detailed],
                "recommended_book_details": detailed,
            }
        )

    seen_by_customer = {
        _to_int(r.get("book_id"))
        for r in ratings
        if _to_int(r.get("customer_id")) == _to_int(customer_id)
    }

    score_sum = defaultdict(float)
    score_count = defaultdict(int)

    for rating in ratings:
        book_id = _to_int(rating.get("book_id"))
        score = _to_int(rating.get("rating"), 0)
        if book_id <= 0 or score <= 0:
            continue
        score_sum[book_id] += score
        score_count[book_id] += 1

    avg_scores = []
    for book in books:
        book_id = _to_int(book.get("id"))
        if book_id <= 0:
            continue
        stock = _to_int(book.get("stock"), 0)
        if stock <= 0:
            continue
        if book_id in seen_by_customer:
            continue

        avg = (score_sum[book_id] / score_count[book_id]) if score_count[book_id] else 0
        avg_scores.append((book, avg, stock))

    # Prioritize higher average rating, then higher stock, then stable by id.
    avg_scores.sort(key=lambda item: (-item[1], -item[2], _to_int(item[0].get("id"))))

    ranked = avg_scores[:limit]
    detailed = [
        {
            "id": _to_int(book.get("id")),
            "title": book.get("title", ""),
            "author": book.get("author", ""),
            "price": book.get("price", 0),
            "stock": _to_int(book.get("stock"), 0),
            "image_url": book.get("image_url", ""),
            "avg_rating": round(avg, 2),
        }
        for book, avg, _ in ranked
    ]
    return Response(
        {
            "customer_id": _to_int(customer_id),
            "recommended_books": [item["id"] for item in detailed],
            "recommended_book_details": detailed,
        }
    )
