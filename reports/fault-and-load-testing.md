# Báo cáo Mô phỏng lỗi và Kiểm thử tải (Chạy lại)

## 1. Phạm vi và Mục tiêu

Tài liệu này ghi nhận lần chạy lại đầy đủ của hai hạng mục kiểm thử bắt buộc:

- Mô phỏng lỗi cho cơ chế Saga trong quá trình tạo đơn hàng.
- Kiểm thử tải cho endpoint health của API Gateway.

Mục tiêu:

- Thay thế toàn bộ số liệu cũ bằng số liệu mới thu thập.
- Xác nhận cơ chế xử lý lỗi và bù trừ (compensation) vẫn hoạt động đúng.
- Đo lại độ trễ và độ ổn định của hệ thống khi gửi nhiều request liên tiếp.

## 2. Môi trường kiểm thử

- Ngày thực hiện: 2026-03-18
- Môi trường chạy: Docker Compose (toàn bộ service hoạt động và healthy)
- Các service tham gia:
  - api-gateway tại cổng 8000
  - order-service tại cổng 8004
  - pay-service tại cổng 8005
  - ship-service tại cổng 8006
  - rabbitmq tại cổng 5672
  - postgres tại cổng 5432

## 3. Mô phỏng lỗi (Lần chạy mới)

### 3.1 Phương pháp

Thực hiện gửi request POST thủ công trực tiếp tới:

- http://localhost:8004/orders/

Ba kịch bản được chạy theo thứ tự:

1. Lỗi ở bước giữ chỗ thanh toán (`simulate_failure_step=payment`)
2. Lỗi ở bước giữ chỗ vận chuyển (`simulate_failure_step=shipping`)
3. Luồng thành công (không truyền cờ mô phỏng lỗi)

Toàn bộ request được chạy lại với customer ID mới và có truyền rõ `book_ids`.

### 3.2 Kết quả mới

Thời điểm chạy: 2026-03-18T22:20:45

| Kịch bản | Order ID mới | Trạng thái cuối | Saga State | Lý do lỗi | Kết quả |
|---|---:|---|---|---|---|
| payment_failure | 16 | FAILED | PAYMENT_RESERVE_FAILED | simulated payment reservation failure | PASS |
| shipping_failure | 17 | FAILED | SHIPPING_RESERVE_FAILED_COMPENSATED | simulated shipping reservation failure | PASS |
| success_flow | 18 | CONFIRMED | CONFIRMED | (rỗng) | PASS |

### 3.3 Phân tích

- Máy trạng thái Saga hoạt động đúng ở cả hai điểm lỗi.
- Cơ chế bù trừ được kích hoạt ở kịch bản lỗi shipping (payment được hoàn bù).
- Luồng thành công đi tới trạng thái cuối CONFIRMED như kỳ vọng.

## 4. Kiểm thử tải (Lần chạy mới)

### 4.1 Phương pháp

Thực hiện vòng lặp request thủ công tới:

- Đích kiểm thử: http://localhost:8000/health/
- Tổng số request: 500
- Chế độ: gửi tuần tự (single-thread loop)
- Chỉ số thu thập: success/failure, trung bình, p95, p99, min, max độ trễ

### 4.2 Kết quả mới

Thời điểm chạy: 2026-03-18T22:20:59

| Chỉ số | Giá trị |
|---|---:|
| Tổng request | 500 |
| Thành công | 500 |
| Thất bại | 0 |
| Tỉ lệ thành công | 100% |
| Độ trễ trung bình | 61.77 ms |
| Độ trễ P95 | 66 ms |
| Độ trễ P99 | 69 ms |
| Độ trễ nhỏ nhất | 27 ms |
| Độ trễ lớn nhất | 81 ms |

### 4.3 Phân tích

- Không ghi nhận request thất bại trong lần chạy lại này.
- P95 và P99 gần với giá trị trung bình, cho thấy phân bố độ trễ ổn định.
- API Gateway thể hiện độ ổn định tốt ở mức tải kiểm thử hiện tại.

## 5. Kết luận

Hai hạng mục kiểm thử đã được chạy lại thành công và thay thế hoàn toàn dữ liệu cũ.

- Mô phỏng lỗi: cả 3 kịch bản cho kết quả đúng như mong đợi.
- Kiểm thử tải: 500/500 request thành công, độ trễ ổn định (p95 = 66 ms, p99 = 69 ms).

## 6. Hướng kiểm thử tiếp theo

Để phần hiệu năng mạnh hơn cho báo cáo/bảo vệ cuối kỳ:

- Bổ sung kịch bản tải đồng thời (nhiều worker), không chỉ tuần tự.
- Chạy thêm các mức tải cao hơn (1000, 2000 request) và so sánh xu hướng p95/p99.
