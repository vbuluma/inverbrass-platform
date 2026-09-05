# SL-CUS-004 — Customer Web Order & Payment Tracking

**Document ID:** IB-ED-SME-SL-CUS-004  
**Version:** 1.0  
**Status:** AUTHORITATIVE — **CERTIFIED** (2026-09-04)  
**Date:** 2026-09-04  
**Slice:** SL-CUS-004  
**Prerequisite:** SL-ENG-003o-002 (CERTIFIED), SL-CUS-001 (CERTIFIED)  
**Closure:** [SL-CUS-004-Customer-Order-Payment-Tracking-Closure-Report.md](./SL-CUS-004-Customer-Order-Payment-Tracking-Closure-Report.md)

---

## 1. Document Control

| Field | Value |
|-------|-------|
| Owner | SME Digitization Launch 1 / Phase 2 |
| Parent | [SME-Digitization-Slice-Register.md](./SME-Digitization-Slice-Register.md) |
| Governing model | IB-ARCH-CHN-001 |
| Engine | ENG-003o |
| Implementation | Customer Web channel expose of BP-006 / BP-007 read paths |

---

## 2. Slice Identity

| Attribute | Value |
|-----------|-------|
| **Slice ID** | SL-CUS-004 |
| **Name** | Customer Web Order & Payment Tracking |
| **Type** | End-to-end customer post-purchase tracking slice |
| **Horizon** | SME Phase 2 |
| **Journey** | **J-CUS-004** Track order |

---

## 3. Business Objective

Enable an SME customer (guest-first) on Customer Web to **list their orders → open an order hub → view canonical BP-006 order details → view canonical BP-007 payment status / amounts / receipt availability** — without a parallel Web order or payment domain.

---

## 4. Explicit exclusions

**CRM Case Management is OUT OF SCOPE for SL-CUS-004.**

Not implemented:

- `CREATE_CASE` / `VIEW_CASE` / complaint / follow-up / service request
- CrmCaseService wiring / case–order linking
- Customer case UX beyond a non-functional “Need help?” deferment placeholder

Future architecture (documented only):

```text
Customer Web → CustomerWebCaseAdapter → ENG-003o → CREATE_CASE/VIEW_CASE → BP-004 IP-09 CrmCaseService
```

---

## 5. Capabilities

| Cap ID | Runtime ID | Access | Notes |
|--------|------------|--------|-------|
| CAP-CUS-011 | `VIEW_ORDER` | Allow | Reuse SL-CUS-001 |
| CAP-CUS-016 | `VIEW_PAYMENT_STATUS` | Allow | Reuse SL-CUS-001 |

**Not invented:** `VIEW_RECEIPT` — not in ENG-003o registry. Receipt availability is an informational flag derived from BP-007 obligation/transaction/receipt rows (same pattern as SL-CUS-001 confirmation).

**Deny:** staff workspaces, procurement, inventory mutation, refunds, case management, configuration.

---

## 6. Channel / Domain

| Layer | Owner |
|-------|-------|
| Channel | Customer Web (`/store/[businessCode]`) |
| Order | BP-006 Sales |
| Payment | BP-007 Payments |
| Engine | ENG-003o (+ ENG-013 correlation where existing) |

---

## 7. Architecture

```text
Customer Web
  → CustomerWebOrderTrackingAdapter / CustomerWebPaymentAdapter
  → ENG-003o (VIEW_ORDER / VIEW_PAYMENT_STATUS)
  → resolveCustomerOrderContext() + assertCustomerOrderAccess()
  → BP-006 / BP-007 domain services & repositories
  → Customer-safe DTOs
```

Shared application helper: `resolveCustomerOrderContext` (not a persisted entity).

Every server request re-authorizes. Client may supply `orderReference` only.

---

## 8. UX routes

| Route | Purpose |
|-------|---------|
| `/store/[businessCode]/orders` | My Orders |
| `/store/[businessCode]/orders/[orderReference]` | Order hub |
| `/store/[businessCode]/purchase/[orderReference]` | SL-CUS-001 confirmation (retained; links to hub) |

---

## 9. Security

- Tenant isolation via URL businessCode → businessId
- Guest/party object-level authorization via order metadata + `assertCustomerOrderAccess`
- Deny Guest B / cross-tenant / guessed references
- Staff RBAC never authorizes Customer Web
- Payment amounts/status re-derived from BP-007 (no client override)

---

## 10. Certification

`scripts/sl-cus-004-customer-order-payment-tracking-certification.ts`

Live proofs: `scripts/sl-cus-004-live-e2e.ts`

---

## 11. Traceability

```text
SME Digitization → CUSTOMER → J-CUS-004
  → VIEW_ORDER, VIEW_PAYMENT_STATUS
  → SL-CUS-004 → Customer Web
  → CustomerWebOrderTrackingAdapter, CustomerWebPaymentAdapter
  → ENG-003o → BP-006, BP-007 → Certification
```

CRM Case is **not** in this chain.
