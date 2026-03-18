# Bookstore Microservice - Docker Guide

## Prerequisites

- Docker Desktop is running
- Docker Compose CLI is available (`docker compose version`)

## Run all services

```bash
docker compose up --build
```

## Run all services in detached mode

```bash
docker compose up --build -d
```

## Stop all services

```bash
docker compose down
```

## Rebuild images only

```bash
docker compose build
```

## Rebuild and restart a single service

```bash
docker compose up --build -d book-service
```

## View logs

```bash
docker compose logs -f
```

## View logs for one service

```bash
docker compose logs -f order-service
```

## Check running containers

```bash
docker compose ps
```

## Quick API checks

- API Gateway: http://localhost:8000/books/
- Customer Service: http://localhost:8001/customers/
- Book Service: http://localhost:8002/books/
- Cart Service: http://localhost:8003/carts/
- Order Service: http://localhost:8004/orders/
- Pay Service: http://localhost:8005/payments/
- Ship Service: http://localhost:8006/shipments/
- Comment Rate Service: http://localhost:8007/ratings/
- Recommender AI Service: http://localhost:8008/recommendations/1/
- Clothes Service: http://localhost:8009/clothes/

## Product image support

- Product images are served by API Gateway from `./image` via: `http://localhost:8000/image/<filename>`
- Current seeded images:
	- Books: `cleancode.png`, `designpatterns.png`, `refactoring.png`
	- Clothes: `Basic T-Shirt.png`, `DenimJacket.png`
- Image thumbnails are shown in:
	- Books, Book Detail
	- Clothes, Clothes Detail
	- Carts, Checkout
	- Orders (including Order History), Order Detail
	- Shipments
	- Payments, Payment Detail
	- Recommendations
- If an image URL is missing or broken, UI automatically falls back to `/image/product-placeholder.svg`.

## Common issue

If you see daemon/pipe errors on Windows (for example `dockerDesktopLinuxEngine`), start Docker Desktop first, then run:

```bash
docker info
```

If `Server` information appears, run compose commands again.


