# SL-CUS-005 — Closure Report

**Document ID:** IB-ED-SME-SL-CUS-005-CR  
**Date:** 2026-09-04  
**Slice:** SL-CUS-005  
**Status:** **IMPLEMENTED — NOT CERTIFIED**

---

## 1. Final status

**IMPLEMENTED — NOT CERTIFIED**

Governance decisions D-05-01…D-05-06 are **LOCKED**.  
Customer Web pay-later path is implemented against existing `INITIATE_PAYMENT`.

Live E2E certification did **not** complete in this session because the Supabase session-mode pooler became exhausted after hung script clients (`max: 1` / EMAXCONNSESSION). Re-run:

```bash
npx tsx scripts/sl-cus-005-customer-payment-certification.ts
```

when pooler slots are available. Do **not** mark READY TO FREEZE until live proofs pass.

---

## 2. Locked decisions

| Dec | Status |
|-----|--------|
| D-05-01 Invoice viewing OUT | **LOCKED** |
| D-05-02 Pay-later via `INITIATE_PAYMENT` | **LOCKED** |
| D-05-03 Partial payment YES | **LOCKED** |
| D-05-04 Payment history OUT | **LOCKED** |
| D-05-05 Receipt viewing OUT | **LOCKED** |
| D-05-06 Party/tenant obligation auth | **LOCKED** |

---

## 3. Scope implemented

- Standalone Customer Web `INITIATE_PAYMENT` gateway path on `CustomerWebPaymentAdapter`
- `resolveCustomerPaymentObligationContext` (order → SALE obligation + Party integrity)
- Full + partial pay UX (`/orders/[orderReference]/pay` + result)
- Order hub **Pay Outstanding** CTA when outstanding &gt; 0
- Stale-balance re-read before initiate
- Channel idempotency key + same-key/different-amount reject
- No `VIEW_INVOICE` / `VIEW_RECEIPT` / `VIEW_PAYMENT_HISTORY` / new payment capability IDs
- No migrations

---

## 4. Architecture

```text
Customer Web
  → CustomerWebPaymentAdapter
  → ENG-003o INITIATE_PAYMENT / VIEW_PAYMENT_STATUS
  → resolveCustomerPaymentObligationContext
  → BP-007 PaymentInitiationService
```

---

## 5. Supporting fix (connection safety)

Serialized concurrent DB reads in:

- `payment-receipt-service.ts` (issueReceipt / toDetail)
- `sales-order-service.ts` (projectFulfilment / toDetailView / listDeliveryViews)

Rationale: postgres.js `max: 1` (Supabase session pooler) + `Promise.all` of parallel queries can hang. Behavior unchanged; reads are sequential.

---

## 6. Database changes

**None**

---

## 7. Certification status

| Gate | Result |
|------|--------|
| D-05-01…06 locked | **PASS** (docs) |
| Capability registry (no invented IDs) | **PASS** (script) |
| Customer Web policy | **PASS** (script) |
| Live full/partial/idempotency/security | **NOT RUN TO COMPLETION** (pooler) |
| TypeScript / ESLint / build | Re-run with cert when live available |
| SL-CUS-001/003/004 regression | Pending with live cert |

---

## 8. Residuals

| ID | Item | Class |
|----|------|-------|
| G-25 | `VIEW_RECEIPT` | Deferred (D-05-05) |
| G-32 | Invoice viewing | Deferred (D-05-01) |
| G-33 | Payment history | Deferred (D-05-04) |
| — | Live E2E pooler recovery | **Blocks FREEZE** |

---

## 9. Traceability

```text
IND-SME → ED-SME-001 → CUSTOMER → J-CUS-005
  → INITIATE_PAYMENT, VIEW_PAYMENT_STATUS
  → SL-CUS-005 → Customer Web → ENG-003o → BP-007
  → IMPLEMENTED — NOT CERTIFIED
```

---

## 10. Freeze recommendation

**Do not freeze.** Re-run `sl-cus-005-customer-payment-certification.ts` after pooler recovery; promote to **CERTIFIED — READY TO FREEZE** only when live proofs pass with zero FAIL.
