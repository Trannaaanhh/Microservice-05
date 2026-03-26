# Book Microservice Project

Du an nay la he thong e-commerce theo kien truc microservice, tap trung vao 2 nhom san pham: sach va thoi trang.

## Tong quan ngan gon

- API Gateway la diem vao chung de dieu phoi request.
- Moi domain duoc tach thanh service rieng: auth, customer, book, cart, order, payment, shipment, recommendation AI, clothes.
- He thong dung PostgreSQL cho du lieu va RabbitMQ cho giao tiep su kien giua cac service.
- Frontend duoc tach rieng trong thu muc `frontend` de phat trien doc lap voi backend.

## Chay he thong

```bash
docker compose up --build -d
```

Sau khi chay, API Gateway truy cap tai `http://localhost:8000`.


