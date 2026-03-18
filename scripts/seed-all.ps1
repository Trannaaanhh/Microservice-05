$ErrorActionPreference = "Stop"

function Run-Seed {
    param(
        [string]$DbName,
        [string]$Sql
    )

    Write-Host "Seeding database: $DbName"
    $Sql | docker compose exec -T postgres psql -X -P pager=off -U postgres -d $DbName -v ON_ERROR_STOP=1
}

Run-Seed -DbName "book_db" -Sql @"
INSERT INTO app_book (id, title, author, price, stock) VALUES
(1, 'Clean Code', 'Robert C. Martin', 15.99, 30),
(2, 'Design Patterns', 'Erich Gamma', 22.50, 15),
(3, 'Refactoring', 'Martin Fowler', 19.75, 20)
ON CONFLICT (id) DO UPDATE SET
title = EXCLUDED.title,
author = EXCLUDED.author,
price = EXCLUDED.price,
stock = EXCLUDED.stock;
SELECT setval(pg_get_serial_sequence('app_book','id'), (SELECT COALESCE(MAX(id),1) FROM app_book), true);
"@

Run-Seed -DbName "customer_db" -Sql @"
INSERT INTO app_customer (id, name, email) VALUES
(1, 'Nguyen Van A', 'a@example.com'),
(2, 'Tran Thi B', 'b@example.com')
ON CONFLICT (id) DO UPDATE SET
name = EXCLUDED.name,
email = EXCLUDED.email;
SELECT setval(pg_get_serial_sequence('app_customer','id'), (SELECT COALESCE(MAX(id),1) FROM app_customer), true);
"@

Run-Seed -DbName "cart_db" -Sql @"
INSERT INTO app_cart (id, customer_id) VALUES
(1, 1),
(2, 2)
ON CONFLICT (id) DO UPDATE SET
customer_id = EXCLUDED.customer_id;

INSERT INTO app_cartitem (id, cart_id, book_id, quantity) VALUES
(1, 1, 1, 2),
(2, 1, 2, 1),
(3, 2, 3, 1)
ON CONFLICT (id) DO UPDATE SET
cart_id = EXCLUDED.cart_id,
book_id = EXCLUDED.book_id,
quantity = EXCLUDED.quantity;

SELECT setval(pg_get_serial_sequence('app_cart','id'), (SELECT COALESCE(MAX(id),1) FROM app_cart), true);
SELECT setval(pg_get_serial_sequence('app_cartitem','id'), (SELECT COALESCE(MAX(id),1) FROM app_cartitem), true);
"@

Run-Seed -DbName "order_db" -Sql @"
INSERT INTO app_order (id, customer_id, status) VALUES
(1, 1, 'PENDING'),
(2, 2, 'CONFIRMED')
ON CONFLICT (id) DO UPDATE SET
customer_id = EXCLUDED.customer_id,
status = EXCLUDED.status;
SELECT setval(pg_get_serial_sequence('app_order','id'), (SELECT COALESCE(MAX(id),1) FROM app_order), true);
"@

Run-Seed -DbName "pay_db" -Sql @"
INSERT INTO app_payment (id, order_id, status) VALUES
(1, 1, 'UNPAID'),
(2, 2, 'PAID')
ON CONFLICT (id) DO UPDATE SET
order_id = EXCLUDED.order_id,
status = EXCLUDED.status;
SELECT setval(pg_get_serial_sequence('app_payment','id'), (SELECT COALESCE(MAX(id),1) FROM app_payment), true);
"@

Run-Seed -DbName "ship_db" -Sql @"
INSERT INTO app_shipment (id, order_id, status) VALUES
(1, 1, 'PENDING'),
(2, 2, 'SHIPPED')
ON CONFLICT (id) DO UPDATE SET
order_id = EXCLUDED.order_id,
status = EXCLUDED.status;
SELECT setval(pg_get_serial_sequence('app_shipment','id'), (SELECT COALESCE(MAX(id),1) FROM app_shipment), true);
"@

Run-Seed -DbName "clothes_db" -Sql @"
INSERT INTO app_cloth (id, name, brand, category, size, color, material, price, stock, description, is_active) VALUES
(1, 'Basic T-Shirt', 'UniWear', 'Top', 'M', 'Black', 'Cotton', 9.99, 100, 'Basic cotton t-shirt', true),
(2, 'Denim Jacket', 'BlueLine', 'Outerwear', 'L', 'Blue', 'Denim', 29.99, 40, 'Classic denim jacket', true)
ON CONFLICT (id) DO UPDATE SET
name = EXCLUDED.name,
brand = EXCLUDED.brand,
category = EXCLUDED.category,
size = EXCLUDED.size,
color = EXCLUDED.color,
material = EXCLUDED.material,
price = EXCLUDED.price,
stock = EXCLUDED.stock,
description = EXCLUDED.description,
is_active = EXCLUDED.is_active;
SELECT setval(pg_get_serial_sequence('app_cloth','id'), (SELECT COALESCE(MAX(id),1) FROM app_cloth), true);
"@

Run-Seed -DbName "comment_db" -Sql @"
INSERT INTO app_rating (id, customer_id, book_id, rating, comment) VALUES
(1, 1, 1, 5, 'Sach rat hay'),
(2, 2, 2, 4, 'Noi dung tot')
ON CONFLICT (id) DO UPDATE SET
customer_id = EXCLUDED.customer_id,
book_id = EXCLUDED.book_id,
rating = EXCLUDED.rating,
comment = EXCLUDED.comment;
SELECT setval(pg_get_serial_sequence('app_rating','id'), (SELECT COALESCE(MAX(id),1) FROM app_rating), true);
"@

Write-Host "Seed completed for all databases."
