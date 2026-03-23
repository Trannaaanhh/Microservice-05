# Sequence Diagrams - BookStore Microservice Architecture

Generated for Phase 3 of verification (25/03 Morning)

---

## 1️⃣ FLOW: CUSTOMER REGISTRATION & LOGIN

### Diagram (Mermaid)

```mermaid
sequenceDiagram
    participant Customer
    participant APIGateway as API Gateway
    participant AuthService as Auth Service
    participant Database as PostgreSQL

    Customer->>APIGateway: POST /register<br/>{email, password, name}
    APIGateway->>AuthService: Validate & Register
    AuthService->>Database: CREATE user{email, hashed_password}
    Database-->>AuthService: ✅ User created (id=101)
    AuthService-->>APIGateway: 201 Created

    APIGateway-->>Customer: Redirect to login page

    Note over Customer: User logs in...

    Customer->>APIGateway: POST /login<br/>{email, password}
    APIGateway->>AuthService: Authenticate
    AuthService->>Database: SELECT user WHERE email=?
    Database-->>AuthService: User data {id, password_hash}
    AuthService->>AuthService: Compare password hashes
    AuthService->>AuthService: Generate JWT Token
    AuthService-->>APIGateway: ✅ JWT {access_token, refresh_token}

    APIGateway->>APIGateway: Set session cookie
    APIGateway-->>Customer: 200 OK<br/>Set-Cookie: session=xyz
```

### Key Points
- **Auth Service** handles all authentication logic
- **JWT tokens** issued for stateless API calls
- **Database** stores hashed passwords (never plaintext)
- **API Gateway** relays requests and manages sessions

---

## 2️⃣ FLOW: BROWSE PRODUCTS & ADD TO CART

### Diagram (Mermaid)

```mermaid
sequenceDiagram
    participant Customer
    participant APIGateway as API Gateway
    participant BookService as Book Service
    participant CartService as Cart Service
    participant Database as PostgreSQL

    Customer->>APIGateway: GET /books?page=1
    APIGateway->>BookService: Query books
    BookService->>Database: SELECT books LIMIT 20
    Database-->>BookService: [Book list with id, title, price]
    BookService-->>APIGateway: JSON response

    APIGateway-->>Customer: Render books page

    Note over Customer: Customer views books and selects one

    Customer->>APIGateway: POST /cart<br/>{book_id: 1, quantity: 2}
    APIGateway->>BookService: Verify book & stock
    BookService->>Database: SELECT stock FROM books WHERE id=1
    Database-->>BookService: {id: 1, stock: 50}
    BookService->>BookService: Check if stock >= 2
    BookService-->>APIGateway: ✅ Book verified

    APIGateway->>CartService: Add to cart
    CartService->>Database: INSERT INTO cart_items {user_id, book_id, qty}
    Database-->>CartService: ✅ Inserted
    CartService-->>APIGateway: {cart_id: 456, items: 1}

    APIGateway-->>Customer: ✅ Added to cart<br/>Cart updated (1 item)
```

### Key Points
- **Book Service** manages product catalog & inventory
- **Stock verification** prevents overselling
- **Cart Service** tracks user's shopping cart
- Each service owns its data store

---

## 3️⃣ FLOW: CHECKOUT & PAYMENT PROCESSING

### Diagram (Mermaid)

```mermaid
sequenceDiagram
    participant Customer
    participant APIGateway as API Gateway
    participant OrderService as Order Service
    participant PaymentService as Payment Service
    participant ShipService as Ship Service
    participant Database as PostgreSQL

    Customer->>APIGateway: POST /checkout<br/>{cart_id: 456, address, phone}
    APIGateway->>OrderService: Create order from cart
    OrderService->>Database: INSERT INTO orders {user_id, total, status='PENDING'}
    Database-->>OrderService: {order_id: 789, status: PENDING}
    OrderService->>Database: INSERT INTO order_items SELECT * FROM cart_items
    Database-->>OrderService: ✅ Order created
    OrderService-->>APIGateway: {order_id: 789, total: 150000}

    APIGateway-->>Customer: ✅ Order created<br/>Proceed to payment

    Note over Customer: Customer enters payment info

    Customer->>APIGateway: POST /payment<br/>{order_id: 789, amount: 150000, method: CARD}
    APIGateway->>PaymentService: Process payment
    PaymentService->>PaymentService: Call payment gateway (Stripe/Momo)
    PaymentService->>Database: INSERT INTO payments {order_id, amount, status='PROCESSING'}
    Database-->>PaymentService: ✅ Payment recorded
    PaymentService->>PaymentService: Receive confirmation from gateway
    PaymentService->>Database: UPDATE payments SET status='COMPLETED'
    Database-->>PaymentService: ✅ Updated

    PaymentService-->>APIGateway: ✅ Payment successful

    APIGateway->>OrderService: Update order status
    OrderService->>Database: UPDATE orders SET status='PAID' WHERE id=789
    Database-->>OrderService: ✅ Updated

    OrderService->>ShipService: Create shipment
    ShipService->>Database: INSERT INTO shipments {order_id, status='PENDING'}
    Database-->>ShipService: {shipment_id: 321, status: PENDING}
    ShipService-->>OrderService: Shipment assigned

    OrderService-->>APIGateway: Order processing

    APIGateway-->>Customer: ✅ Payment confirmed!<br/>Order is being processed
```

### Key Points
- **Order Service** owns order creation and status
- **Payment Service** integrates external payment gateways
- **Ship Service** handles logistics automatically after payment
- **Transactional integrity** - payment must complete before shipment
- **Database** spans multiple services (each owns their tables)

---

## 4️⃣ FLOW: PRODUCT RATING & RECOMMENDATIONS

### Diagram (Mermaid)

```mermaid
sequenceDiagram
    participant Customer
    participant APIGateway as API Gateway
    participant RatingService as Rating Service
    participant RecommenderAI as Recommender AI
    participant Database as PostgreSQL

    Customer->>APIGateway: GET /books/42
    APIGateway->>RatingService: Get ratings for book 42
    RatingService->>Database: SELECT * FROM ratings WHERE book_id=42
    Database-->>RatingService: [Rating list with stars, reviews]
    RatingService->>RatingService: Calculate avg_rating, count
    RatingService-->>APIGateway: {avg: 4.5, count: 128}

    APIGateway-->>Customer: Display book with ratings

    Note over Customer: Customer reads and rates book

    Customer->>APIGateway: POST /ratings<br/>{book_id: 42, rating: 5, review: 'Great!'}
    APIGateway->>RatingService: Save rating
    RatingService->>Database: INSERT INTO ratings {user_id, book_id, rating, review}
    Database-->>RatingService: ✅ Saved
    RatingService-->>APIGateway: ✅ Rating recorded

    APIGateway-->>Customer: Thank you for rating!

    Note over Customer, RecommenderAI: Later, customer requests recommendations

    Customer->>APIGateway: GET /recommendations
    APIGateway->>RecommenderAI: Get recommendations
    RecommenderAI->>Database: SELECT user_history, user_ratings
    Database-->>RecommenderAI: User profile data
    RecommenderAI->>RecommenderAI: Apply ML model<br/>(Collaborative filtering)
    RecommenderAI->>RecommenderAI: Score all books
    RecommenderAI->>RecommenderAI: Sort by score, limit top 10
    RecommenderAI-->>APIGateway: [book_id: 55, 67, 88]

    APIGateway-->>Customer: Display recommended books
```

### Key Points
- **Rating Service** manages user reviews and ratings
- **Recommender AI** uses ML models for personalization
- **Collaborative filtering** uses similar users' ratings
- **Data aggregation** - AI service queries historical data for analysis

---

## 5️⃣ FLOW: ORDER STATUS TRACKING & NOTIFICATIONS

### Diagram (Mermaid)

```mermaid
sequenceDiagram
    participant Customer
    participant APIGateway as API Gateway
    participant OrderService as Order Service
    participant ShipService as Ship Service
    participant Database as PostgreSQL
    participant MessageBus as RabbitMQ

    Customer->>APIGateway: GET /orders/789
    APIGateway->>OrderService: Fetch order details
    OrderService->>Database: SELECT * FROM orders WHERE id=789
    Database-->>OrderService: {order_id: 789, status: 'PAID', total: 150000}
    OrderService->>ShipService: Get shipment status
    ShipService->>Database: SELECT * FROM shipments WHERE order_id=789
    Database-->>ShipService: {shipment_id: 321, status: 'IN_TRANSIT', tracking_id: 'VN123456'}

    ShipService-->>OrderService: Shipment details
    OrderService-->>APIGateway: Full order with shipment

    APIGateway-->>Customer: Display order page<br/>Status: Paid, Shipment in transit

    Note over ShipService: Shipment status update

    ShipService->>MessageBus: Publish 'shipment.updated' event
    MessageBus->>OrderService: Receive event
    OrderService->>Database: UPDATE orders SET status='IN_TRANSIT'
    Database-->>OrderService: ✅ Updated
    OrderService->>MessageBus: Publish 'order.status_changed' event

    MessageBus->>APIGateway: Receive notification
    APIGateway->>Customer: 🔔 Push notification<br/>'Your order is on the way!'
```

### Key Points
- **Event-driven architecture** using RabbitMQ
- **Loose coupling** - services update via message bus
- **Pub/Sub pattern** - multiple services can listen to events
- **Real-time updates** - customers notified instantly

---

## 6️⃣ FLOW: ERROR HANDLING & RETRY LOGIC

### Diagram (Mermaid)

```mermaid
sequenceDiagram
    participant APIGateway as API Gateway
    participant BookService as Book Service
    participant Database as PostgreSQL

    APIGateway->>BookService: GET /books/1
    BookService->>Database: SELECT * FROM books WHERE id=1
    Note over Database: Connection timeout

    Database--xBookService: ❌ Connection refused
    BookService->>BookService: Retry (attempt 1/3)
    activate BookService
    
    BookService->>Database: SELECT * FROM books WHERE id=1
    Database--xBookService: ❌ Connection refused
    BookService->>BookService: Retry (attempt 2/3)
    
    BookService->>Database: SELECT * FROM books WHERE id=1
    Database--xBookService: ❌ Connection refused
    BookService->>BookService: Retry (attempt 3/3)
    
    BookService->>Database: SELECT * FROM books WHERE id=1
    Database-->>BookService: ✅ Connected<br/>[Book data]
    deactivate BookService

    BookService-->>APIGateway: ✅ Data after retries

    APIGateway-->>APIGateway: Cache response (5 min)
    APIGateway-->>APIGateway: Return to client

    Note over APIGateway,Database: If all retries fail<br/>return cached data<br/>or 503 Service Unavailable
```

### Key Points
- **Exponential backoff** - retry with increasing delays
- **Circuit breaker pattern** - fail fast after 3 retries
- **Fallback cache** - serve stale data if service unavailable
- **Graceful degradation** - partial functionality maintained

---

## 7️⃣ FLOW: DATABASE TRANSACTION (ORDER + PAYMENT + INVENTORY)

### Diagram (Mermaid)

```mermaid
sequenceDiagram
    participant PaymentService as Payment Service
    participant BookService as Book Service
    participant OrderService as Order Service
    participant Database as PostgreSQL

    PaymentService->>Database: BEGIN TRANSACTION
    Database-->>PaymentService: Transaction started

    PaymentService->>Database: INSERT payment_record {order_id, amount}
    Database-->>PaymentService: ✅ Inserted

    PaymentService->>BookService: Reduce inventory
    BookService->>Database: UPDATE books SET stock -= 2 WHERE id=1
    Database-->>BookService: ✅ Updated stock

    BookService->>BookService: Check: stock < minimum?
    alt Stock Low
        BookService->>Database: INSERT into low_stock_alerts
        Database-->>BookService: ✅ Alert created
    end

    PaymentService->>OrderService: Mark order as completed
    OrderService->>Database: UPDATE orders SET status='COMPLETED'
    Database-->>OrderService: ✅ Updated

    PaymentService->>Database: COMMIT TRANSACTION
    Database-->>PaymentService: ✅ Transaction committed

    PaymentService-->>PaymentService: All changes persisted
```

### Key Points
- **ACID transactions** - all or nothing
- **Coordination** - multiple services in single transaction
- **Inventory management** - stock updated atomically
- **Data consistency** - no orphaned orders or "phantom" stock"

---

## 8️⃣ ARCHITECTURE: OVERALL DATA FLOW

### Diagram (Mermaid)

```mermaid
graph TB
    subgraph Client["Client Layer"]
        Web["🌐 Web Browser<br/>localhost:8000"]
        Mobile["📱 Mobile App"]
    end

    subgraph APILayer["API Gateway Layer"]
        Gateway["🌉 API Gateway<br/>Django<br/>Port 8000"]
    end

    subgraph ServiceLayer["Microservice Layer"]
        Auth["🔐 Auth Service<br/>Port 8010"]
        Customer["👥 Customer<br/>Port 8001"]
        Book["📚 Book<br/>Port 8002"]
        Cart["🛒 Cart<br/>Port 8003"]
        Order["📦 Order<br/>Port 8004"]
        Payment["💳 Payment<br/>Port 8005"]
        Ship["🚚 Shipment<br/>Port 8006"]
        Rating["⭐ Rating<br/>Port 8007"]
        AI["🤖 Recommender AI<br/>Port 8008"]
        Clothes["👔 Clothes<br/>Port 8009"]
    end

    subgraph DataLayer["Data & Message Layer"]
        Postgres["🐘 PostgreSQL<br/>10 Databases<br/>Port 5432"]
        RabbitMQ["🐰 RabbitMQ<br/>Message Bus<br/>Port 5672"]
    end

    Web -->|HTTP Requests| Gateway
    Mobile -->|REST API| Gateway

    Gateway -->|Route /auth| Auth
    Gateway -->|Route /customers| Customer
    Gateway -->|Route /books| Book
    Gateway -->|Route /carts| Cart
    Gateway -->|Route /orders| Order
    Gateway -->|Route /payments| Payment
    Gateway -->|Route /shipments| Ship
    Gateway -->|Route /ratings| Rating
    Gateway -->|Route /recommendations| AI
    Gateway -->|Route /clothes| Clothes

    Auth -->|Read/Write| Postgres
    Customer -->|Read/Write| Postgres
    Book -->|Read/Write| Postgres
    Cart -->|Read/Write| Postgres
    Order -->|Read/Write| Postgres
    Payment -->|Read/Write| Postgres
    Ship -->|Read/Write| Postgres
    Rating -->|Read/Write| Postgres
    AI -->|Read| Postgres
    Clothes -->|Read/Write| Postgres

    Order -->|Publish events| RabbitMQ
    Payment -->|Publish events| RabbitMQ
    Ship -->|Listen & Publish| RabbitMQ
    RabbitMQ -->|Update listeners| Order
    RabbitMQ -->|Notify| Gateway

    style Web fill:#e1f5ff
    style Mobile fill:#e1f5ff
    style Gateway fill:#fff3e0
    style Postgres fill:#f3e5f5
    style RabbitMQ fill:#e8f5e9
```

### Key Points
- **Horizontal scaling** - each service can scale independently
- **Database per service** - data isolation and autonomy
- **Message bus** - asynchronous communication
- **Single gateway** - unified API entry point

---

## 🎯 MERMAID RENDERING GUIDE

### For Markdown Viewers (GitHub, GitLab)
The diagrams above are automatically rendered as you view this file.

### For Presentations (Powerpoint/Google Slides)
1. Go to: https://mermaid.live
2. Paste diagram code from above
3. Export as PNG/SVG
4. Insert into slides

### For Documentation (Confluence, Wiki)
Use Mermaid plugin for your platform:
- Confluence: `https://marketplace.atlassian.com/apps/1211988/mermaid-for-confluence`
- GitBook: Built-in support
- Notion: Paste code blocks with language `mermaid`

### For CI/CD Documentation
Include in your `.md` files with:
````markdown
```mermaid
sequenceDiagram
    ...your diagram code...
```
````

---

## 📚 USAGE IN PHASE 3

### Deliverables Checklist
- [x] **8 Sequence Diagrams** created (1-8 above)
- [x] **Architecture Overview** shown (#8)
- [x] **Error Handling** documented (#6)
- [x] **Transaction Flow** detailed (#7)
- [x] **Event-driven patterns** illustrated (#5)

### How to Present
1. **Monday/Tuesday Morning**: Show diagrams #1-4 (core flows)
2. **Tuesday Afternoon**: Show diagrams #5-7 (advanced patterns)
3. **Wednesday Morning**: Show diagram #8 (full architecture)
4. **Live Demo**: Run actual microservices and point to execution traces in diagrams

### Quick Reference
- **Customer journey**: #2 → #3 → #4
- **Backend coordination**: #5 → #6 → #7
- **System overview**: #8

---

**Document**: SEQUENCE_DIAGRAMS.md
**Created**: 23/03/2025
**For**: Phase 3 of Microservice Verification (25/03)
**Format**: Mermaid.js (compatible with GitHub, GitLab, Notion, Confluence)
**Status**: Ready for Presentation
