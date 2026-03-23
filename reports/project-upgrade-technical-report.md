# Project Upgrade Technical Report

## Contents
1. Problem Overview
2. Scope and Technical Objectives
   1. Implementation Scope
   2. Evaluation Objectives
3. System Architecture After Upgrade
   1. Core Components
   2. High-Level Control Flow
4. Detailed Technical Implementation
   1. Auth Service: JWT and RBAC Internals
   2. Gateway Middleware Pipeline
   3. Saga Orchestration Design in Order Service
   4. RabbitMQ Integration and Consumer Model
   5. Observability and Metrics Model
5. Implementation by Phase
   1. Phase 1 - Auth Foundation
   2. Phase 2 - Saga Upgrade
   3. Phase 3 - Event Bus RabbitMQ
   4. Phase 4 - Gateway Hardening + Observability
   5. Phase 5 - Validation Deliverables
   6. Phase 6 - Release Gate
6. Validation Results and Evidence
   1. Acceptance Summary (Clean Build)
   2. Quantitative Evidence Snapshot
7. Scripts and Reproducibility
   1. Script Inventory
   2. Reproduction Commands
   3. Fault-Simulation Method
8. Academic Assessment and Discussion
   1. Pass/Fail Assessment
   2. Architectural Contributions
   3. Limitations and Non-Blocking Debt
9. Final Conclusion
A. Appendix A - Main Endpoints
B. Appendix B - Release Artifacts

---

## 1. Problem Overview

The original bookstore microservice platform had a working service split, but lacked a cohesive production-style control plane for authentication, role-based access control, failure recovery in distributed transactions, and observability evidence for evaluation.

The upgrade focuses on strengthening system reliability and governance across service boundaries:

- Standardizing identity using JWT from Auth Service.
- Enforcing RBAC at the gateway and UI flow level.
- Implementing Saga-based order orchestration with compensation.
- Moving inter-service reservation steps to RabbitMQ RPC flows.
- Adding health, metrics, and repeatable validation scripts.

## 2. Scope and Technical Objectives

### 2.1 Implementation Scope

The upgrade includes the following concrete areas:

- Auth service token issuance and verification with role claims.
- Gateway middleware chain for auth, rate limit, and request logging.
- Order service orchestration for payment and shipping reserve/release.
- RabbitMQ consumer threads in payment and shipping services.
- Metrics endpoints in gateway and critical business services.
- Validation scripts for fault simulation, load test, and data seeding.

### 2.2 Evaluation Objectives

The technical objectives used for acceptance are:

- Functional correctness of token issuance, verification, and role gating.
- Correct saga state transition under payment failure, shipping failure, and success.
- Correct compensation behavior when shipping reservation fails.
- Stable service behavior under repeated health-check requests.
- Reproducibility through scripted setup and validation commands.

## 3. System Architecture After Upgrade

### 3.1 Core Components

The upgraded topology runs on Docker Compose with PostgreSQL and RabbitMQ as shared infrastructure.

- API Gateway (port 8000): entrypoint, session + JWT gate, view orchestration.
- Auth Service (port 8010): JWT issue/verify and auth metrics.
- Domain services (ports 8001-8009): customer, book, cart, order, pay, ship, comment-rate, recommender, clothes.
- RabbitMQ: synchronous RPC over queues for reserve/release steps.
- PostgreSQL: per-service logical databases.

### 3.2 High-Level Control Flow

Primary request flow for checkout:

1. User logs in at gateway and receives session-bound JWT from Auth Service.
2. Gateway validates token via middleware and resolves role.
3. Checkout request is forwarded to Order Service.
4. Order Service starts saga:
   - payment.reserve (RPC)
   - shipping.reserve (RPC)
5. If shipping fails, order-service triggers compensation payment.release.
6. Order state is persisted and domain event is published.
7. Gateway renders consolidated state from order/payment/shipping services.

## 4. Detailed Technical Implementation

### 4.1 Auth Service: JWT and RBAC Internals

Implemented in auth-service/app/views.py:

- JWT algorithm: HS256.
- Secret source: JWT_SECRET environment variable.
- Token TTL source: JWT_ACCESS_TOKEN_SECONDS (default 3600).
- Claims include sub, role, iat, exp.

Endpoints:

- POST /auth/token/: issue access token from username + role.
- POST /auth/verify/: verify and decode token claims.
- GET /health/: service liveness.
- GET /metrics/: requests and issued-token counters.

RBAC is enforced at gateway level via Django User/Group mapping:

- Supported roles: customer, staff.
- Users are auto-provisioned at first login in demo flow.
- Staff-only operations are blocked in gateway views when role check fails.

### 4.2 Gateway Middleware Pipeline

Configured in api-gateway/api_gateway/settings.py with custom middleware in api-gateway/api_gateway/middleware.py.

Custom stages:

- JWTAuthenticationMiddleware:
  - Exempts login/logout/health/metrics/static/image routes.
  - Extracts Bearer token from Authorization header or session access_token.
  - Decodes token using shared secret and populates request claims/role.
  - Clears stale session token on expiration or invalid signature.

- RateLimitMiddleware:
  - Sliding window 60 seconds.
  - Keyed by REMOTE_ADDR.
  - Limit configured by RATE_LIMIT_PER_MINUTE (default 120).
  - Returns HTTP 429 on overflow.

- RequestLoggingMiddleware:
  - Captures method, path, status, duration, client address.
  - Writes structured JSON logs.
  - Pushes counters into gateway metrics registry.

### 4.3 Saga Orchestration Design in Order Service

Order orchestration is implemented in order-service/app/views.py (OrderListCreate.post).

State model:

- status: PENDING, CONFIRMED, FAILED.
- saga_state: ORDER_PENDING, PAYMENT_RESERVE_FAILED, SHIPPING_RESERVE_FAILED_COMPENSATED, CONFIRMED.
- fail_reason: failure details for audit.

Flow:

1. Create order in ORDER_PENDING.
2. RPC payment.reserve.
3. If payment reserve fails:
   - set FAILED + PAYMENT_RESERVE_FAILED
   - publish order.failed
4. Else RPC shipping.reserve.
5. If shipping reserve fails:
   - call payment.release compensation
   - set FAILED + SHIPPING_RESERVE_FAILED_COMPENSATED
   - publish order.compensated
6. If both reserves succeed:
   - set CONFIRMED
   - publish order.confirmed

The orchestration intentionally returns 201 with final order state for each branch to simplify gateway-side UX handling.

### 4.4 RabbitMQ Integration and Consumer Model

RPC and event operations are implemented in order-service/app/event_bus.py:

- rpc_call(queue, payload, timeout=8):
  - declares durable target queue
  - creates exclusive callback queue
  - publishes with correlation_id and reply_to
  - polls until timeout

- publish_event(type, payload):
  - publishes persistent message envelope to fanout exchange bookstore.events

Consumers:

- pay-service/app/event_consumer.py:
  - queues: payment.reserve, payment.release
  - updates Payment status to RESERVED/RELEASED
  - supports simulated failure via simulate_failure flag or PAYMENT_FAIL_IDS

- ship-service/app/event_consumer.py:
  - queues: shipping.reserve, shipping.release
  - updates Shipment status to RESERVED/RELEASED
  - supports simulated failure via simulate_failure flag or SHIPPING_FAIL_IDS

Consumer runtime model:

- each service starts consumer thread in AppConfig.ready() during runserver main process.
- basic_qos(prefetch_count=1) ensures one-message-at-a-time handling.
- reconnect loop retries on broker/channel errors.

### 4.5 Observability and Metrics Model

Current observability is lightweight but operationally useful:

- Gateway metrics (api-gateway/api_gateway/metrics.py):
  - requests_total
  - status_by_code map

- Auth metrics (auth-service/app/views.py):
  - requests_total
  - tokens_issued_total

- Order metrics (order-service/app/views.py):
  - orders_total
  - orders_confirmed
  - orders_failed

All critical services expose /health and /metrics endpoints used by scripts and manual validation.

## 5. Implementation by Phase

### 5.1 Phase 1 - Auth Foundation

- Add auth-service endpoints for token issue/verify.
- Define JWT claim schema and secret/TTL environment configuration.
- Integrate gateway login flow with auth-service token issuance.

### 5.2 Phase 2 - Saga Upgrade

- Add order status machine and saga_state transitions.
- Build compensation branch for shipping failure -> payment release.
- Persist fail_reason for post-mortem traceability.

### 5.3 Phase 3 - Event Bus RabbitMQ

- Add request-reply RPC helper in order-service.
- Implement payment/shipping consumer handlers and queue bindings.
- Enable simulated failures to test compensation deterministically.

### 5.4 Phase 4 - Gateway Hardening + Observability

- Add middleware-driven JWT guard and rate limiting.
- Add structured request logging at gateway edge.
- Add metrics snapshots on gateway/auth/order services.

### 5.5 Phase 5 - Validation Deliverables

- Fault simulation script for three saga scenarios.
- Load test script with configurable request count and target.
- JSON output artifact for quantitative reporting.

### 5.6 Phase 6 - Release Gate

Release is accepted when all checks pass:

- docker compose build and run successful.
- health endpoints green for all required services.
- saga simulation shows expected states for failure/success branches.
- load test reports zero failures at baseline run.

## 6. Validation Results and Evidence

### 6.1 Acceptance Summary (Clean Build)

Based on current report artifacts:

- Fault simulation scenarios pass:
  - payment failure -> FAILED + PAYMENT_RESERVE_FAILED
  - shipping failure -> FAILED + SHIPPING_RESERVE_FAILED_COMPENSATED
  - success flow -> CONFIRMED
- Load run to gateway health endpoint completed with 0 failed requests.

### 6.2 Quantitative Evidence Snapshot

Evidence from reports/fault-and-load-testing.md and scripts/load-test-results.json:

- 500-request sequential run snapshot:
  - success 500, failed 0
  - avg ~61.77 ms, p95 66 ms, p99 69 ms
- Additional captured run in JSON artifact:
  - requests 50, success 50, failed 0
  - avg 53.6 ms, min 20 ms, max 60 ms

These figures indicate stable baseline response under non-concurrent synthetic load.

## 7. Scripts and Reproducibility

### 7.1 Script Inventory

Located in scripts/:

- create-multiple-postgres-databases.sh: multi-database bootstrap for postgres container.
- seed-all.ps1: deterministic SQL seed for core domain data.
- fault-simulation.ps1: invokes saga failure/success scenarios.
- load-test.ps1: sequential HTTP probe with summary stats.
- load-test-results.json: persisted output from latest load script run.

### 7.2 Reproduction Commands

```powershell
# 1) Start the full stack
docker compose up --build -d

# 2) Verify container status
docker compose ps

# 3) Optional seed
powershell -ExecutionPolicy Bypass -File .\scripts\seed-all.ps1

# 4) Run saga fault simulation
powershell -ExecutionPolicy Bypass -File .\scripts\fault-simulation.ps1

# 5) Run load test (default 100 requests)
powershell -ExecutionPolicy Bypass -File .\scripts\load-test.ps1

# 6) Run load test with custom request count
powershell -ExecutionPolicy Bypass -File .\scripts\load-test.ps1 -Requests 500
```

### 7.3 Fault-Simulation Method

Method contract:

- Endpoint: POST http://localhost:8004/orders/
- Payload key: simulate_failure_step
  - payment: force payment reservation failure
  - shipping: force shipping reservation failure and trigger compensation
  - omit key: normal successful path

Expected results:

- order.status and order.saga_state exactly match scenario branch.
- compensation branch must leave payment state as released.

## 8. Academic Assessment and Discussion

### 8.1 Pass/Fail Assessment

Current implementation satisfies the primary acceptance criteria:

- Pass: Auth token issuance/verification and role-based path control.
- Pass: Saga compensation and deterministic branch testing.
- Pass: Scripted reproducibility and measurable performance snapshot.

### 8.2 Architectural Contributions

The upgrade contributes the following engineering value:

- Clear separation of concerns between gateway identity enforcement and domain logic.
- Explicit distributed transaction handling using saga orchestration.
- Broker-mediated RPC model that keeps service ownership isolated.
- Low-friction observability model suitable for coursework demos and debugging.

### 8.3 Limitations and Non-Blocking Debt

Known limitations:

- No centralized trace IDs across all services yet.
- Metrics are per-service snapshots, not aggregated in a TSDB.
- Load test is sequential baseline; concurrency stress is not yet included.
- Event bus consumer startup is tied to runserver process model.

These are non-blocking for current release scope, but recommended for next iteration.

## 9. Final Conclusion

The project now demonstrates a coherent microservice control architecture: JWT-based identity, gateway RBAC enforcement, RabbitMQ-backed saga orchestration with compensation, and reproducible validation evidence. This is sufficient for a technically defensible release in an academic evaluation setting and provides a clear path for future production hardening.

## Appendix A - Main Endpoints

### API Gateway (8000)

- GET /health/
- GET /metrics/
- GET|POST /login/
- GET /logout/
- GET /books/
- GET /books/{id}/
- GET /clothes/
- GET /clothes/{id}/
- GET /customers/
- GET|POST /carts/
- GET|PUT|DELETE /cart-items/{id}/
- GET|POST /checkout/
- GET|POST /orders/
- GET /orders/{id}/
- GET|POST /payments/
- GET /payments/{id}/
- GET|POST /shipments/
- GET /recommendations/

### Auth Service (8010)

- POST /auth/token/
- POST /auth/verify/
- GET /health/
- GET /metrics/

### Order Service (8004)

- GET|POST /orders/
- GET|PUT|DELETE /orders/{id}/
- GET /health/
- GET /metrics/

### Pay Service (8005)

- GET|POST /payments/
- GET|PUT|DELETE /payments/{id}/
- GET /health/
- GET /metrics/

### Ship Service (8006)

- GET|POST /shipments/
- GET|PUT|DELETE /shipments/{id}/
- GET /health/
- GET /metrics/

## Appendix B - Release Artifacts

- reports/fault-and-load-testing.md
- reports/project-upgrade-technical-report.md
- scripts/fault-simulation.ps1
- scripts/load-test.ps1
- scripts/load-test-results.json
- scripts/seed-all.ps1
- docker-compose.yml