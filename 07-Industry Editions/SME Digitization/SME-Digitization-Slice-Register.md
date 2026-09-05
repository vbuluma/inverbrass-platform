# SME Digitization Slice Register

**Document ID:** IB-ED-SME-004  
**Version:** 1.0  
**Status:** AUTHORITATIVE — Launch 1 Slice Register  
**Date:** 2026-09-03  
**Parent:** [SME Digitization Edition Definition](./SME-Digitization-Edition-Definition.md)

---

## 1. Purpose

Register SME Digitization **slices** as complete end-to-end implementation/certification units — not screens or CRUD endpoints.

---

## 2. Slice priority (first 5)

| Rank | Slice ID | Name | Horizon | Status |
|------|----------|------|---------|--------|
| **1** | **SL-ENG-003o-002** | Customer Web foundation | MVP prerequisite | **CERTIFIED** |
| **2** | **SL-CUS-001** | Web goods purchase | MVP | **CERTIFIED** |
| **3** | **SL-CUS-005** | Customer payment against existing obligation | Phase 2 | **IMPLEMENTED — NOT CERTIFIED** |
| **4** | **SL-CUS-003** | Web quotation request | Phase 2 | **CERTIFIED** |
| **5** | **SL-CUS-004** | Customer order / payment tracking | Phase 2 | **CERTIFIED** |

Reuse (already delivered — not new work):

| Slice ID | Status |
|----------|--------|
| SL-PLT-001 | CERTIFIED |
| SL-STAFF-001 | IMPLEMENTED |
| SL-ENG-003o-001 | IMPLEMENTED |

---

## 3. Slice specifications

### SL-ENG-003o-002 — Customer Web foundation

| Field | Value |
|-------|-------|
| Journey | Enables all J-CUS-* |
| Actor | Customer / Guest |
| Capability set | CAP-PLT-012, CAP-PLT-014, CAP-PLT-015 |
| Channel | Customer Web |
| Domain/BP | ENG-003o (no new BP) |
| Engines | ENG-003o, ENG-001 (optional account) |
| Dependencies | ENG-003o staff path (SL-ENG-003o-001) |
| Existing | Gateway, registry, session foundation |
| New | `WebCustomerChannelAdapter`, customer identity, guest session cookie, tenant-from-URL, Customer Web policy, customer-safe DTO helpers, resource scope, cart session contract, CREATE_SALE idempotency key contract, `/store/[businessCode]` shell |
| Certification | `scripts/eng003o-customer-web-foundation-smoke.ts` (33/33) + staff ENG-003o smoke + typecheck |
| Status | **CERTIFIED** (2026-09-03) |

#### Certification evidence

| Gate | Result |
|------|--------|
| Implementation | `03-platform/src/core/channel-experience/customer/` |
| Tenant isolation | PASS (URL tenant; session mismatch deny; staff cookie not used) |
| Capability authorization | PASS (allow-list; staff-only deny; staff grants ignored) |
| Session security | PASS (opaque UUID; HMAC; HttpOnly; path `/store`; rotation) |
| Resource scoping | PASS (guest/party/tenant checks) |
| Customer DTOs | PASS (forbidden field guard) |
| Staff regression | PASS (`eng003o-channel-smoke-validation.ts`) |
| Residual for SL-CUS-001 | None — SL-CUS-001 CERTIFIED 2026-09-03 |

---

### SL-CUS-001 — Web goods purchase

| Field | Value |
|-------|-------|
| Journey | **J-CUS-001** Purchase Goods |
| Actor | Customer (guest-first) |
| Capability set | CAP-CUS-001, 002, 005, 007, 010, 011, 016 (+ cart session) |
| Channel | Customer Web |
| Domain/BP | BP-003, BP-005, BP-006, BP-007, BP-008 |
| Engines | ENG-003o, ENG-006, ENG-013, ENG-007 |
| Dependencies | SL-ENG-003o-002 |
| Existing | Domain services: offering, price, availability, createDirectSale, payment initiate, order/payment read |
| New | Storefront routes, customer DTOs, customer policy grants, checkout UX |
| Certification | Functional E2E; tenant isolation; no staff RBAC; no inventory mutation from customer; idempotency; audit correlation; staff regression |
| Status | **CERTIFIED** (2026-09-03) — see [SL-CUS-001 Requirements](./SL-CUS-001-Customer-Web-Goods-Purchase-Requirements.md) §44 |

#### Traceability (validated)

```text
Industry: IND-SME / IND-COM
Business Type: RETAIL
Edition: ED-SME-001
Actor: CUSTOMER
Journey: J-CUS-001
Capabilities: OFFERING_VIEW, PRICE_QUERY, STOCK_AVAILABILITY_QUERY,
              CREATE_SALE, INITIATE_PAYMENT, VIEW_ORDER, VIEW_PAYMENT_STATUS
Channel: Customer Web
Domain: BP-003 / BP-005 / BP-006 / BP-007 / BP-008
Engine: ENG-003o + ENG-006 + ENG-013
Certification: sl-cus-001-customer-web-goods-purchase-certification.ts 73/0/4 — **CERTIFIED**
```

#### REUSE / NEW / BLOCKED

| Class | Items |
|-------|-------|
| **REUSE** | Product/offering read; commercial price resolution; inventory availability query; SalesOrderService.createDirectSale; PaymentInitiationService; payment-ready contract; audit helpers; Party create/match at checkout |
| **NEW** | WebCustomerChannelAdapter; resolveCustomerWebIdentity; Customer Web policy; `/store/[businessCode]` routes; guest cookie; CustomerWeb.* grants; customer DTOs; `sales_idempotency` |
| **BLOCKED** | None for Launch 1 vertical path |

---

### SL-CUS-005 — Customer payment against existing payment obligation

| Field | Value |
|-------|-------|
| Journey | **J-CUS-005** |
| Actor | Customer (guest-first; Party-scoped) |
| Capability set | CAP-CUS-010 (`INITIATE_PAYMENT`), CAP-CUS-016 (`VIEW_PAYMENT_STATUS`) |
| Channel | Customer Web |
| Domain/BP | BP-007 (+ BP-006 order anchor) |
| Engines | ENG-003o, ENG-006 |
| Dependencies | SL-ENG-003o-002; SL-CUS-001; SL-CUS-004 |
| Existing | `INITIATE_PAYMENT`; `VIEW_PAYMENT_STATUS`; `PaymentInitiationService`; order resource auth |
| New | Standalone CW `INITIATE_PAYMENT` gateway path; `resolveCustomerPaymentObligationContext`; Pay Outstanding UX; partial pay |
| Explicitly deferred | `VIEW_INVOICE` (D-05-01); `VIEW_PAYMENT_HISTORY` (D-05-04); `VIEW_RECEIPT` (D-05-05 / G-25) |
| Locked decisions | D-05-01 … D-05-06 |
| Certification | `scripts/sl-cus-005-customer-payment-certification.ts` |
| Status | **IMPLEMENTED — NOT CERTIFIED** (live E2E blocked by session pooler; re-run cert) |

#### Traceability

```text
Industry: IND-SME
Edition: ED-SME-001
Actor: CUSTOMER
Journey: J-CUS-005
Capabilities: INITIATE_PAYMENT, VIEW_PAYMENT_STATUS
Channel: Customer Web
Domain: BP-007 (IP-01/IP-02/IP-03) via BP-006 order anchor
Engine: ENG-003o
Invoice / receipt view / payment history: OUT OF SCOPE
```

#### REUSE / NEW / BLOCKED / DEFERRED

| Class | Items |
|-------|-------|
| **REUSE** | `PaymentInitiationService`; obligation/txn/receipt repos; `CustomerWebPaymentAdapter` (extend); order context auth; Customer Web grants; no new capability IDs |
| **NEW** | Obligation payment context resolver; standalone `INITIATE_PAYMENT` invoke; pay UX + customer-safe payment result DTO |
| **BLOCKED** | None — domain already owns payment |
| **DEFERRED** | Invoice view; payment history; receipt view |

---

### SL-CUS-003 — Web quotation request

| Field | Value |
|-------|-------|
| Journey | **J-CUS-003** |
| Actor | Customer (guest-first) |
| Capability set | CAP-CUS-001/002, CAP-CUS-008 → `CREATE_QUOTATION`, `VIEW_QUOTATION` |
| Channel | Customer Web |
| Domain/BP | BP-004 (canonical), BP-003, BP-002 |
| Engines | ENG-003o, ENG-013 |
| Dependencies | SL-ENG-003o-002; BP-004 QuotationService |
| Existing | Staff CREATE_QUOTATION / QuotationService / schema |
| New | Customer channel expose; `VIEW_QUOTATION`; quotation idempotency; storefront quote UX |
| Certification | `scripts/sl-cus-003-customer-quotation-request-certification.ts` **54 PASS / 0 FAIL / 0 NA** |
| Status | **CERTIFIED** (2026-09-04) — see [Closure Report](./SL-CUS-003-Customer-Quotation-Request-Closure-Report.md) |

#### Traceability

```text
Industry: IND-SME
Edition: ED-SME-001
Actor: CUSTOMER
Journey: J-CUS-003
Capabilities: OFFERING_VIEW, PRICE_QUERY, CREATE_QUOTATION, VIEW_QUOTATION
Channel: Customer Web
Domain: BP-004 (+ BP-003/BP-002)
Engine: ENG-003o + ENG-013
```

#### REUSE / NEW / BLOCKED

| Class | Items |
|-------|-------|
| **REUSE** | QuotationService; quotation entity/lifecycle; pricing adapter; guest party; Customer Web foundation |
| **NEW** | CustomerWeb quotation grants; VIEW_QUOTATION registry; quotation_idempotency; quote storefront routes; customer-safe quotation DTOs |
| **BLOCKED** | None — quotation domain already defined (no Web-owned quotation capability) |

---

### SL-CUS-004 — Order / payment tracking

| Field | Value |
|-------|-------|
| Journey | **J-CUS-004** |
| Actor | Customer (guest-first) |
| Capability set | CAP-CUS-011 (`VIEW_ORDER`), CAP-CUS-016 (`VIEW_PAYMENT_STATUS`) |
| Channel | Customer Web |
| Domain/BP | BP-006, BP-007 |
| Engines | ENG-003o, ENG-013 (correlation), ENG-006 (existing payment path) |
| Dependencies | SL-CUS-001 |
| Existing | VIEW_ORDER / VIEW_PAYMENT_STATUS; order resource auth; purchase confirmation |
| New | `resolveCustomerOrderContext`; `CustomerWebOrderTrackingAdapter`; `CustomerWebPaymentAdapter`; My Orders + Order Hub routes; customer-safe hub DTOs |
| Explicitly deferred | **CRM Case Management** (CREATE_CASE / VIEW_CASE / complaint / follow-up) — separate future customer-touchpoint slices over BP-004 IP-09 |
| Certification | `scripts/sl-cus-004-customer-order-payment-tracking-certification.ts` **36 PASS / 0 FAIL / 0 NA** |
| Status | **CERTIFIED** (2026-09-04) — see [Requirements](./SL-CUS-004-Customer-Order-Payment-Tracking-Requirements.md) / [Closure](./SL-CUS-004-Customer-Order-Payment-Tracking-Closure-Report.md) |

#### Traceability

```text
Industry: IND-SME
Edition: ED-SME-001
Actor: CUSTOMER
Journey: J-CUS-004
Capabilities: VIEW_ORDER, VIEW_PAYMENT_STATUS
Channel: Customer Web
Domain: BP-006 / BP-007
Engine: ENG-003o
CRM Case: DEFERRED (not in this slice)
```

#### REUSE / NEW / BLOCKED / DEFERRED

| Class | Items |
|-------|-------|
| **REUSE** | SalesOrderService reads; payment obligation/transaction/receipt repos; assertCustomerOrderAccess; Customer Web foundation; VIEW_ORDER / VIEW_PAYMENT_STATUS |
| **NEW** | Order tracking + payment adapters; shared order context resolver; `/orders` hub UX; listCandidatesForCustomerWebScope query |
| **BLOCKED** | None for order/payment tracking |
| **DEFERRED** | CRM Case / complaint / follow-up customer channel expose |

---

### SL-PLT-001 — Business onboarding (reuse)

| Field | Value |
|-------|-------|
| Journey | J-PLT-001 |
| Status | **CERTIFIED** |
| New for SME Edition | None — reuse |

### SL-STAFF-001 — Staff operations workspace (reuse)

| Field | Value |
|-------|-------|
| Journey | J-STAFF-001–005 (ops hub) |
| Status | **IMPLEMENTED** (BP-006/009 certified) |
| New for SME Edition | None for MVP; Phase 2 may add UX polish only |

---

## 4. Customer Web security model (implemented — SL-ENG-003o-002)

```text
Customer Web Request
        ↓
Tenant resolution (businessCode → businessId) — explicit, secure
        ↓
Guest session OR authenticated customer account
        ↓
Customer identity → Party (BP-002) — never Business Membership
        ↓
Customer Web Policy (allow-list) — NEVER Staff RBAC
        ↓
Capability authorization (CustomerWeb.* grants)
        ↓
Channel Gateway (ENG-003o Customer path)
        ↓
Domain service (BP-003/005/006/007/008) — wired in SL-CUS-001
```

### Explicit rules

| Topic | Decision for SME MVP | Status |
|-------|----------------------|--------|
| Guest vs authenticated | Guest-first; optional account | **APPROVED (D-01)** — implemented |
| Tenant discovery | `/store/[businessCode]` using `business.code` | **APPROVED (D-02)** — implemented |
| Customer → Party | Create/match at checkout; party_role CUSTOMER | **CONTRACT** — full bind PENDING_IAM / SL-CUS-001 |
| Session context | sessionId, tenantId, partyId?, channel=WEB, actorType=CUSTOMER\|ANONYMOUS, correlationId, cart | **IMPLEMENTED** |
| Allow-list | OFFERING_VIEW, PRICE_QUERY, STOCK_AVAILABILITY_QUERY, CREATE_SALE, INITIATE_PAYMENT, VIEW_ORDER, VIEW_PAYMENT_STATUS (+ CUSTOMER_ACCOUNT_VIEW auth-only) | **IMPLEMENTED** |
| Deny-list | All `*_WORKSPACE`, procurement, inventory mutation, governance, refunds, config | **IMPLEMENTED** |
| Cross-tenant | businessId from URL must match every domain call | **IMPLEMENTED** (gateway + resource scope) |
| Audit / correlation | Propagate correlationId on WRITE | **IMPLEMENTED** (gateway context) |
| Staff RBAC reuse | **FORBIDDEN** | Affirmed + enforced |

Unresolved items → [Gap & Decision Register](./SME-Edition-Gap-and-Decision-Register.md).

---

## 5. SL-CUS-001 readiness verdict

### Verdict: **CERTIFIED** (2026-09-03)

| Area | Ready? |
|------|--------|
| Domain contracts (BP-003/005/006/007/008) | **Yes** |
| Staff Web regression baseline | **Yes** |
| ENG-003o gateway (staff) | **Yes** |
| Customer Web adapter | **Yes** |
| Customer identity / guest session | **Yes** (Party bind at checkout implemented) |
| Customer Web policy partition | **Yes** |
| Tenant-from-URL | **Yes** |
| Customer commerce DTOs | **Yes** |
| CREATE_SALE idempotency for customer | **Yes** — migration applied + live uniqueness proven |
| Guest order/payment scoping | **Yes** |
| Storefront UX + live E2E | **Yes** |
| Concurrent idempotency | **Yes** |
| Payment + receipt evidence | **Yes** (local BP-007 path) |

---

## 6. Full SME slice register table

| Slice ID | Journey | Actor | Caps | Channel | BP/Engine | Existing | New | Cert | Status |
|----------|---------|-------|------|---------|-----------|----------|-----|------|--------|
| SL-PLT-001 | J-PLT-001 | Owner | PLT-001–005 | Platform Web | BP-001 | Full | — | Done | CERTIFIED |
| SL-STAFF-001 | J-STAFF-* | Staff | Workspaces | Staff Web | BP-002–009 | Full | — | Partial cert | IMPLEMENTED |
| SL-ENG-003o-001 | Staff ops | Staff | Gateway | Staff Web | ENG-003o | Full | — | Smoke | IMPLEMENTED |
| SL-ENG-003o-002 | Foundation | Customer | PLT-012/014/015 | Customer Web | ENG-003o | Full | Adapter+IAM+policy | Smoke 33/33 | **CERTIFIED** |
| SL-CUS-001 | J-CUS-001 | Customer | CUS commerce | Customer Web | BP-003/5/6/7/8 | Domains+handlers | Storefront+DTO+idempotency | 73/0/4 | **CERTIFIED** |
| SL-CUS-005 | J-CUS-005 | Customer | INITIATE_PAYMENT + VIEW_PAYMENT_STATUS | Customer Web | BP-007 | Domain+auth | Pay-later adapter+UX | Required | **IMPLEMENTED — live cert pending** |
| SL-CUS-003 | J-CUS-003 | Customer | Quote | Customer Web | BP-003/4 | Domain+handlers | Adapter+idempotency+UX | 54/0/0 | **CERTIFIED** |
| SL-CUS-004 | J-CUS-004 | Customer | Track | Customer Web | BP-006/7 | Domain+auth | Adapter+hub UX | 36/0/0 | **CERTIFIED** |
| SL-INT-001/002 | J-INT-* | Supplier | Token | Token Web | BP-009 | Partial | Harden | Phase 2 | PARTIAL |

---

*SL-ENG-003o-002 certified 2026-09-03. SL-CUS-001 **CERTIFIED** 2026-09-03 (migration + live E2E + concurrency + quality gates).*
