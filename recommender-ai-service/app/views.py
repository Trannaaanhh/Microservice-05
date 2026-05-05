import requests
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .recommender_engine import rebuild_model, recommend_books

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


def _build_recommendation_payload(customer_id, recommendations):
    return {
        "customer_id": _to_int(customer_id),
        "recommended_books": [item["id"] for item in recommendations],
        "recommended_book_details": recommendations,
    }


@api_view(['GET'])
def get_recommendation(request, customer_id):
    limit = _to_int(request.GET.get("limit"), DEFAULT_LIMIT)
    if limit <= 0:
        limit = DEFAULT_LIMIT

    ratings = _safe_get_json(RATING_SERVICE_URL)
    books = _safe_get_json(BOOK_SERVICE_URL)

    recommendations = recommend_books(customer_id=_to_int(customer_id), ratings=ratings, books=books, limit=limit)
    return Response(_build_recommendation_payload(customer_id, recommendations))


@api_view(['POST'])
def rebuild_recommendation_model(request):
    ratings = _safe_get_json(RATING_SERVICE_URL)
    books = _safe_get_json(BOOK_SERVICE_URL)
    return Response(rebuild_model(ratings=ratings, books=books))
