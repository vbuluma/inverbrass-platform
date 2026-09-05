# SME Edition Gap & Decision Register

**Document ID:** IB-ED-SME-005  
**Version:** 1.3  
**Status:** ACTIVE — Decision / Gap tracking for Launch 1  
**Date:** 2026-09-03  
**Parent:** [SME Digitization Edition Definition](./SME-Digitization-Edition-Definition.md)

---

## 1. Purpose

Track **MISSING**, **NEEDS_DECISION**, **PLANNED**, and **VISION** items for SME Digitization Launch 1.

---

## 2. Gap register

| Gap ID | Description | Evidence | Classification | Blocks SL-CUS-001? |
|--------|-------------|----------|----------------|--------------------|
| G-01 | Web Customer Channel Adapter | `customer/adapter.ts` | **RESOLVED** | No |
| G-02 | Customer identity / Party bind | Guest party at checkout implemented; full platformUser→Party IAM still soft | **PARTIAL** | Soft (post-cert) |
| G-03 | Customer Web policy partition | `customer/policy.ts` | **RESOLVED** | No |
| G-04 | Guest session cookie | `customer/guest-session.ts` | **RESOLVED** | No |
| G-05 | Tenant-from-URL | `customer/tenant-resolution.ts` | **RESOLVED** | No |
| G-06 | `OFFERING_VIEW` staff context | Registry fixed | **RESOLVED** | No |
| G-07 | Workspace non-staff flags | Registry fixed | **RESOLVED** | No |
| G-08 | Customer-safe commerce DTOs | `customer/dto.ts` commerce mappers | **RESOLVED** | No |
| G-09 | CREATE_SALE domain idempotency | Migration `0094` applied; live uniqueness + concurrent proofs | **RESOLVED** | No |
| G-10 | Guest order/payment read scoping | Wired on VIEW_ORDER | **RESOLVED** | No |
| G-11 | Customer receipt delivery | Confirmation view; external delivery out of scope | **PARTIAL** (D-06) | Soft |
| G-12 | Cart session | `customer/cart.ts` | **RESOLVED** | No |
| G-20 | CAP-CUS-008 runtime assignment | Mapped to `CREATE_QUOTATION` channel expose | **RESOLVED** | N/A (SL-CUS-003) |
| G-21 | Customer VIEW_QUOTATION registry | ENG-003o `VIEW_QUOTATION` | **RESOLVED** | N/A (SL-CUS-003) |
| G-22 | Quotation create idempotency | Migration `0095` applied; live uniqueness + concurrent 8/8 | **RESOLVED** | No |
| G-23 | SL-CUS-004 My Orders / Order Hub | Adapters + `/orders` routes; cert 36/0/0 | **RESOLVED** | N/A |
| G-24 | Customer CRM Case channel expose | Explicitly deferred from SL-CUS-004 | **DEFERRED** | N/A — future slice |
| G-25 | `VIEW_RECEIPT` capability | Not in ENG-003o registry; informational `receiptAvailable` only | **DEFERRED** / residual | Soft |
| G-30 | Pay-later against existing obligation | Domain + `INITIATE_PAYMENT` exist; CW checkout-only path | **RESOLVED** (SL-CUS-005) | N/A |
| G-31 | Standalone CW gateway invoke for `INITIATE_PAYMENT` | Nested under CREATE_SALE only | **RESOLVED** (SL-CUS-005) | N/A |
| G-32 | Invoice customer viewing not governed | Staff invoice domain exists | **DEFERRED** (D-05-01 OUT) | N/A |
| G-33 | Payment history not customer-governed | Latest txn ref only | **DEFERRED** (D-05-04 OUT) | N/A |
| G-34 | Staff-originated obligation customer auth | Party/tenant object auth required | **RESOLVED** (D-05-06) | N/A |
| G-35 | Customer partial payment policy | Domain IP-03 supports | **RESOLVED** (D-05-03 YES) | N/A |
| G-13–G-19 | Edition/vision items | Unchanged | **VISION/PLANNED** | No |

---

## 3. Decision register

| Dec ID | Status |
|--------|--------|
| D-01 Guest-first | **APPROVED — implemented** |
| D-02 `/store/[businessCode]` | **APPROVED — implemented** |
| D-03 Session cart | **APPROVED — implemented** |
| D-04 CustomerWeb grants | **APPROVED — implemented** |
| D-05 Cart not formal capability | **APPROVED** |
| D-06 Receipt in completion (no external delivery) | **APPROVED — implemented** |
| D-Q-01 Quotation request = DRAFT quotation (no QUOTE_REQUEST entity) | **APPROVED** |
| D-Q-02 CAP-CUS-008 runtime = CREATE_QUOTATION | **APPROVED** |
| D-004-01 SL-CUS-004 = order + payment tracking only | **APPROVED** |
| D-004-02 CRM Case Management deferred from SL-CUS-004 | **APPROVED** |
| D-004-03 No VIEW_RECEIPT invented; receiptAvailable informational | **APPROVED** |
| D-05-01 Customer invoice viewing OUT OF SCOPE for SL-CUS-005; no `VIEW_INVOICE` | **LOCKED** |
| D-05-02 Pay-later against existing obligation via `INITIATE_PAYMENT` (no new payment capability IDs) | **LOCKED** |
| D-05-03 Customer partial payment YES (0 < amount ≤ authoritative outstanding; server-side) | **LOCKED** |
| D-05-04 Payment history OUT OF SCOPE; no `VIEW_PAYMENT_HISTORY` | **LOCKED** |
| D-05-05 Receipt viewing OUT OF SCOPE; retain informational `receiptAvailable`; G-25 remains deferred | **LOCKED** |
| D-05-06 Auth = tenant + Party/order resource scope (not origin, not opaque ID possession) | **LOCKED** |

---

## 4. Certification evidence

| Claim | Evidence | Status |
|-------|----------|--------|
| Customer Web foundation | eng003o-customer-web-foundation-smoke 33/33 | **CERTIFIED** |
| Customer Web goods purchase | sl-cus-001-customer-web-goods-purchase-certification **73 PASS / 0 FAIL / 4 NA** | **CERTIFIED** |
| Customer quotation request | sl-cus-003-customer-quotation-request-certification **54 PASS / 0 FAIL / 0 NA** | **CERTIFIED** |
| Customer order / payment tracking | sl-cus-004-customer-order-payment-tracking-certification **36 PASS / 0 FAIL / 0 NA** | **CERTIFIED** |
| Customer payment against existing obligation | sl-cus-005-customer-payment-certification | **IMPLEMENTED — NOT CERTIFIED** (live pending) |
| Staff ENG-003o | eng003o-channel-smoke-validation | **PASS** (regression) |
| Quality gates | typecheck + eslint + production build | **PASS** (in SL-CUS-003 cert) |
| BP regression | BP-006 50/50; BP-007 53/53; BP-008 IP-01 47/47 | **PASS** |

---

## 5. Post-certification residuals (non-blocking)

1. Full platformUser→Party IAM bind (G-02 soft)
2. External receipt delivery (out of scope; D-06)
3. Multi-actor stock sell-out race harness (NA with reason)
4. Live external payment provider E2E (not configured locally; internal CASH path certified)

---

*SL-CUS-001 **CERTIFIED** 2026-09-03.*
