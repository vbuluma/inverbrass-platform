# SL-CUS-005 — Customer Payment Against Existing Payment Obligation

**Document ID:** IB-ED-SME-SL-CUS-005  
**Version:** 1.0  
**Status:** AUTHORITATIVE — **IMPLEMENTED — NOT CERTIFIED** (live E2E pending)  
**Date:** 2026-09-04  
**Slice:** SL-CUS-005  
**Prerequisite:** SL-ENG-003o-002, SL-CUS-001, SL-CUS-004  
**Closure:** [SL-CUS-005-Customer-Payment-Against-Existing-Payment-Obligation-Closure-Report.md](./SL-CUS-005-Customer-Payment-Against-Existing-Payment-Obligation-Closure-Report.md)

---

## 1. Slice identity

| Attribute | Value |
|-----------|-------|
| **Slice ID** | SL-CUS-005 |
| **Name** | Customer Payment Against Existing Payment Obligation |
| **Journey** | **J-CUS-005** |
| **Actor** | Customer (guest-first; Party-scoped) |
| **Channel** | Customer Web |
| **Engine** | ENG-003o |
| **Domain** | BP-007 (IP-01 / IP-02 / IP-03 as required) |
| **Primary capability** | CAP-CUS-010 `INITIATE_PAYMENT` |
| **Supporting capability** | CAP-CUS-016 `VIEW_PAYMENT_STATUS` |

---

## 2. Locked decisions

| Dec ID | Decision | Status |
|--------|----------|--------|
| D-05-01 | Invoice viewing OUT OF SCOPE; no `VIEW_INVOICE` | **LOCKED** |
| D-05-02 | Pay-later via existing `INITIATE_PAYMENT` (no new payment capability IDs) | **LOCKED** |
| D-05-03 | Customer partial payment YES (0 < amount ≤ authoritative outstanding) | **LOCKED** |
| D-05-04 | Payment history OUT OF SCOPE; no `VIEW_PAYMENT_HISTORY` | **LOCKED** |
| D-05-05 | Receipt viewing OUT OF SCOPE; informational `receiptAvailable` only | **LOCKED** |
| D-05-06 | Auth = tenant + Party/order resource scope (not opaque ID possession) | **LOCKED** |

---

## 3. Architecture

```text
Customer Web
  → CustomerWebPaymentAdapter
  → ENG-003o INITIATE_PAYMENT / VIEW_PAYMENT_STATUS
  → resolveCustomerPaymentObligationContext
  → BP-007 PaymentInitiationService
  → Payment Obligation / Transaction / Allocation
```

No `WebPaymentService`. No Customer Web payment business rules.

---

## 4. Explicit exclusions

- `VIEW_INVOICE` / invoice UI
- `VIEW_PAYMENT_HISTORY`
- `VIEW_RECEIPT` / external receipt delivery
- Refunds, reversals, settlement, exceptions admin
- New payment/obligation/invoice domains or capability IDs
- CRM Case Management

---

## 5. UX routes

| Route | Purpose |
|-------|---------|
| `/store/[businessCode]/orders/[orderReference]` | Order hub — Pay Outstanding CTA when outstanding &gt; 0 |
| `/store/[businessCode]/orders/[orderReference]/pay` | Enter full/partial amount + confirm |
| `/store/[businessCode]/orders/[orderReference]/pay/result` | Payment result + remaining outstanding |

---

## 6. Security

- Tenant from URL `businessCode`
- Every request: `resolveCustomerOrderContext` → obligation by order + SALE instruction
- Party linkage integrity (D-05-06)
- Outstanding re-read immediately before initiate (stale-safe)
- Channel idempotency key + BP-007 transaction idempotency
- Same key + different amount → reject at adapter boundary

---

## 7. Certification

`scripts/sl-cus-005-customer-payment-certification.ts`  
Live proofs: `scripts/sl-cus-005-live-e2e.ts`

**Current:** governance/unit gates implemented; live E2E must be re-run when Supabase session pooler slots are free (prior hung clients exhausted the pooler).

---

## 8. Traceability

```text
IND-SME → ED-SME-001 → CUSTOMER → J-CUS-005
  → CAP-CUS-010 INITIATE_PAYMENT
  → CAP-CUS-016 VIEW_PAYMENT_STATUS
  → SL-CUS-005 → Customer Web
  → CustomerWebPaymentAdapter
  → ENG-003o → BP-007 IP-01/IP-02/IP-03
```
