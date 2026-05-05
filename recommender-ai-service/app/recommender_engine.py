from __future__ import annotations

import hashlib
import json
import os
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

import tensorflow as tf


MODEL_DIR = Path(__file__).resolve().parent / "artifacts"
MODEL_PATH = MODEL_DIR / "recommendation_model.keras"
META_PATH = MODEL_DIR / "recommendation_model.json"
EMBEDDING_DIM = 32

_MODEL_CACHE: "RecommendationBundle | None" = None


@dataclass(slots=True)
class RecommendationBundle:
    model: tf.keras.Model
    customer_index: dict[int, int]
    book_index: dict[int, int]
    signature: str


def _to_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _build_signature(ratings: list[dict[str, Any]], books: list[dict[str, Any]]) -> str:
    payload = {
        "ratings": [
            [_to_int(item.get("customer_id")), _to_int(item.get("book_id")), _to_int(item.get("rating"))]
            for item in ratings
        ],
        "books": [[_to_int(item.get("id")), _to_int(item.get("stock"))] for item in books],
    }
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _build_model(customer_count: int, book_count: int) -> tf.keras.Model:
    customer_input = tf.keras.layers.Input(shape=(1,), name="customer_id")
    book_input = tf.keras.layers.Input(shape=(1,), name="book_id")

    customer_embedding = tf.keras.layers.Embedding(customer_count, EMBEDDING_DIM, name="customer_embedding")(customer_input)
    book_embedding = tf.keras.layers.Embedding(book_count, EMBEDDING_DIM, name="book_embedding")(book_input)

    customer_vector = tf.keras.layers.Flatten()(customer_embedding)
    book_vector = tf.keras.layers.Flatten()(book_embedding)
    interaction = tf.keras.layers.Dot(axes=1)([customer_embedding, book_embedding])
    interaction = tf.keras.layers.Flatten()(interaction)

    features = tf.keras.layers.Concatenate()([customer_vector, book_vector, interaction])
    features = tf.keras.layers.Dense(64, activation="relu")(features)
    features = tf.keras.layers.Dropout(0.2)(features)
    features = tf.keras.layers.Dense(32, activation="relu")(features)
    output = tf.keras.layers.Dense(1, activation="sigmoid", name="preference_score")(features)

    model = tf.keras.Model(inputs=[customer_input, book_input], outputs=output, name="recommendation_model")
    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.001), loss="binary_crossentropy")
    return model


def _build_training_rows(
    ratings: list[dict[str, Any]],
    customer_index: dict[int, int],
    book_index: dict[int, int],
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    customer_rows: list[int] = []
    book_rows: list[int] = []
    labels: list[float] = []

    for rating in ratings:
        customer_id = _to_int(rating.get("customer_id"))
        book_id = _to_int(rating.get("book_id"))
        score = _to_float(rating.get("rating"))

        if customer_id not in customer_index or book_id not in book_index:
            continue
        if score <= 0:
            continue

        customer_rows.append(customer_index[customer_id])
        book_rows.append(book_index[book_id])
        labels.append(min(score / 5.0, 1.0))

    return (
        np.asarray(customer_rows, dtype=np.int32),
        np.asarray(book_rows, dtype=np.int32),
        np.asarray(labels, dtype=np.float32),
    )


def _save_bundle(bundle: RecommendationBundle) -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    bundle.model.save(MODEL_PATH)
    META_PATH.write_text(
        json.dumps(
            {
                "signature": bundle.signature,
                "customer_ids": [customer_id for customer_id in sorted(bundle.customer_index, key=bundle.customer_index.get)],
                "book_ids": [book_id for book_id in sorted(bundle.book_index, key=bundle.book_index.get)],
            },
            ensure_ascii=True,
            indent=2,
        ),
        encoding="utf-8",
    )


def _load_bundle() -> RecommendationBundle | None:
    if not MODEL_PATH.exists() or not META_PATH.exists():
        return None

    try:
        meta = json.loads(META_PATH.read_text(encoding="utf-8"))
        model = tf.keras.models.load_model(MODEL_PATH)
        customer_ids = [_to_int(customer_id) for customer_id in meta.get("customer_ids", [])]
        book_ids = [_to_int(book_id) for book_id in meta.get("book_ids", [])]
        customer_index = {customer_id: index + 1 for index, customer_id in enumerate(customer_ids)}
        book_index = {book_id: index + 1 for index, book_id in enumerate(book_ids)}
        return RecommendationBundle(
            model=model,
            customer_index=customer_index,
            book_index=book_index,
            signature=str(meta.get("signature", "")),
        )
    except Exception:
        return None


def _train_bundle(ratings: list[dict[str, Any]], books: list[dict[str, Any]], signature: str) -> RecommendationBundle | None:
    customer_ids = sorted({customer_id for customer_id in (_to_int(item.get("customer_id")) for item in ratings) if customer_id > 0})
    book_ids = sorted({book_id for book_id in (_to_int(item.get("id")) for item in books) if book_id > 0})

    if len(customer_ids) < 1 or len(book_ids) < 2 or len(ratings) < 3:
        return None

    customer_index = {customer_id: index + 1 for index, customer_id in enumerate(customer_ids)}
    book_index = {book_id: index + 1 for index, book_id in enumerate(book_ids)}
    customer_rows, book_rows, labels = _build_training_rows(ratings, customer_index, book_index)

    if labels.size < 3:
        return None

    model = _build_model(len(customer_index) + 1, len(book_index) + 1)
    batch_size = min(32, int(labels.size))
    callbacks = [tf.keras.callbacks.EarlyStopping(monitor="loss", patience=2, restore_best_weights=True)]

    model.fit(
        [customer_rows, book_rows],
        labels,
        epochs=10,
        batch_size=batch_size,
        verbose=0,
        callbacks=callbacks,
    )

    bundle = RecommendationBundle(
        model=model,
        customer_index=customer_index,
        book_index=book_index,
        signature=signature,
    )
    _save_bundle(bundle)
    return bundle


def _get_bundle(ratings: list[dict[str, Any]], books: list[dict[str, Any]]) -> RecommendationBundle | None:
    global _MODEL_CACHE

    signature = _build_signature(ratings, books)
    if _MODEL_CACHE and _MODEL_CACHE.signature == signature:
        return _MODEL_CACHE

    bundle = _load_bundle()
    if bundle and bundle.signature == signature:
        _MODEL_CACHE = bundle
        return bundle

    bundle = _train_bundle(ratings, books, signature)
    _MODEL_CACHE = bundle
    return bundle


def rebuild_model(ratings: list[dict[str, Any]], books: list[dict[str, Any]]) -> dict[str, Any]:
    global _MODEL_CACHE

    signature = _build_signature(ratings, books)
    _MODEL_CACHE = _train_bundle(ratings, books, signature)

    if not _MODEL_CACHE:
        return {"trained": False, "signature": signature, "message": "Not enough data to train the model."}

    return {
        "trained": True,
        "signature": signature,
        "customer_count": len(_MODEL_CACHE.customer_index),
        "book_count": len(_MODEL_CACHE.book_index),
        "message": "Model retrained successfully.",
    }


def _build_popularity_scores(
    ratings: list[dict[str, Any]],
    books: list[dict[str, Any]],
    seen_book_ids: set[int],
    limit: int,
) -> list[dict[str, Any]]:
    score_sum: defaultdict[int, float] = defaultdict(float)
    score_count: defaultdict[int, int] = defaultdict(int)

    for rating in ratings:
        book_id = _to_int(rating.get("book_id"))
        score = _to_float(rating.get("rating"))
        if book_id <= 0 or score <= 0:
            continue
        score_sum[book_id] += score
        score_count[book_id] += 1

    ranked_books: list[tuple[dict[str, Any], float, int]] = []
    for book in books:
        book_id = _to_int(book.get("id"))
        stock = _to_int(book.get("stock"))
        if book_id <= 0 or stock <= 0 or book_id in seen_book_ids:
            continue

        average_rating = score_sum[book_id] / score_count[book_id] if score_count[book_id] else 0.0
        ranked_books.append((book, average_rating, stock))

    ranked_books.sort(key=lambda item: (-item[1], -item[2], _to_int(item[0].get("id"))))

    return [
        {
            "id": _to_int(book.get("id")),
            "title": book.get("title", ""),
            "author": book.get("author", ""),
            "price": book.get("price", 0),
            "stock": _to_int(book.get("stock")),
            "image_url": book.get("image_url", ""),
            "avg_rating": round(average_rating, 2),
            "predicted_score": round(average_rating / 5.0, 4),
        }
        for book, average_rating, _ in ranked_books[:limit]
    ]


def recommend_books(
    customer_id: int,
    ratings: list[dict[str, Any]],
    books: list[dict[str, Any]],
    limit: int,
) -> list[dict[str, Any]]:
    if limit <= 0:
        return []

    seen_book_ids = {
        _to_int(rating.get("book_id"))
        for rating in ratings
        if _to_int(rating.get("customer_id")) == customer_id and _to_int(rating.get("book_id")) > 0
    }

    available_books = [book for book in books if _to_int(book.get("stock")) > 0 and _to_int(book.get("id")) not in seen_book_ids]
    if not available_books:
        return []

    bundle = _get_bundle(ratings, books)
    if not bundle or customer_id not in bundle.customer_index:
        return _build_popularity_scores(ratings, books, seen_book_ids, limit)

    customer_index = bundle.customer_index[customer_id]
    candidate_books = [book for book in available_books if _to_int(book.get("id")) in bundle.book_index]
    if not candidate_books:
        return _build_popularity_scores(ratings, books, seen_book_ids, limit)

    customer_rows = np.full(len(candidate_books), customer_index, dtype=np.int32)
    book_rows = np.asarray([bundle.book_index[_to_int(book.get("id"))] for book in candidate_books], dtype=np.int32)

    predicted_scores = bundle.model.predict([customer_rows, book_rows], verbose=0).reshape(-1)
    ranked_books = sorted(
        zip(candidate_books, predicted_scores),
        key=lambda item: (-float(item[1]), -_to_int(item[0].get("stock")), _to_int(item[0].get("id"))),
    )

    detailed_books: list[dict[str, Any]] = []
    for book, score in ranked_books[:limit]:
        book_id = _to_int(book.get("id"))
        score_value = float(score)
        detailed_books.append(
            {
                "id": book_id,
                "title": book.get("title", ""),
                "author": book.get("author", ""),
                "price": book.get("price", 0),
                "stock": _to_int(book.get("stock")),
                "image_url": book.get("image_url", ""),
                "avg_rating": round(score_value * 5.0, 2),
                "predicted_score": round(score_value, 4),
            }
        )

    return detailed_books