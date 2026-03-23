# Bookstore Microservice - Docker Guide

Tai lieu nay giup ban chay nhanh toan bo he thong microservice bang Docker Compose.

## 1) Dieu kien can

- Docker Desktop dang chay
- Docker Compose san sang: `docker compose version`

## 2) Chay nhanh (khuyen dung)

Chay toan bo service o che do nen:

```bash
docker compose up --build -d
```

Kiem tra container da len day du:

```bash
docker compose ps
```

Xem log toan he thong:

```bash
docker compose logs -f
```

## 3) Lenh thong dung

Chay foreground (hien log truc tiep):

```bash
docker compose up --build
```

Dung toan bo he thong:

```bash
docker compose down
```

Build lai image (khong khoi dong lai):

```bash
docker compose build
```

Build va khoi dong lai 1 service (vi du book-service):

```bash
docker compose up --build -d book-service
```

Xem log 1 service (vi du order-service):

```bash
docker compose logs -f order-service
```

## 4) Danh sach API nhanh

| Service | URL |
|---|---|
| API Gateway | http://localhost:8000/books/ |
| Customer Service | http://localhost:8001/customers/ |
| Book Service | http://localhost:8002/books/ |
| Cart Service | http://localhost:8003/carts/ |
| Order Service | http://localhost:8004/orders/ |
| Pay Service | http://localhost:8005/payments/ |
| Ship Service | http://localhost:8006/shipments/ |
| Comment Rate Service | http://localhost:8007/ratings/ |
| Recommender AI Service | http://localhost:8008/recommendations/1/ |
| Clothes Service | http://localhost:8009/clothes/ |

## 5) Luu y khi sua giao dien (templates)

- Giao dien storefront trong API Gateway da duoc thiet ke lai.
- Trong repo nay, khi sua template/HTML/CSS trong container, can build lai image de thay doi co hieu luc.
- Lenh khuyen dung:

```bash
docker compose up --build -d
```

## 6) Ho tro hinh anh san pham

- API Gateway phuc vu anh tu thu muc `./image` theo duong dan:
	`http://localhost:8000/image/<filename>`
- Anh da seed san:
	- Books: `cleancode.png`, `designpatterns.png`, `refactoring.png`
	- Clothes: `Basic T-Shirt.png`, `DenimJacket.png`
- Thumbnail dang duoc hien thi o:
	- Books, Book Detail
	- Clothes, Clothes Detail
	- Carts, Checkout
	- Orders (gom Order History), Order Detail
	- Shipments
	- Payments, Payment Detail
	- Recommendations
- Neu URL anh thieu hoac loi, UI se tu dong fallback ve `/image/product-placeholder.svg`.

## 7) Loi thuong gap tren Windows

Neu gap loi daemon/pipe (vi du `dockerDesktopLinuxEngine`):

1. Mo Docker Desktop.
2. Chay lenh kiem tra:

```bash
docker info
```

3. Neu thay thong tin `Server`, chay lai lenh compose.

## 8) Tai lieu ky thuat nang cap

- Bao cao tong hop ky thuat: `reports/project-upgrade-technical-report.md`
- Bao cao tieng Anh ban copy truc tiep: `reports/project-upgrade-technical-report-final.txt`
- Bao cao fault + load test: `reports/fault-and-load-testing.md`


