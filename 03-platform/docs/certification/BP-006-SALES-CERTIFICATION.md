# BP-001 → BP-006 — Sales Certification Record

**Date:** 2026-08-24  
**Environment:** `03-platform` in-process sales harness + spawned IP-01–IP-05 smoke scripts  
**Branch:** `develop`  
**Business used:** Journey Alpha Services KE (synthetic biz-a)  
**Customer used:** Test Customer Alpha  
**Validator:** `03-platform/scripts/bp006-ip06-sales-certification.ts`  
**Certification status:** **CERTIFIED — BP-007 may start (payment not implemented here)**

---

## 1. Executive conclusion

BP-001 → BP-006 continuity holds for the locked sales path:

**Business / customer (BP-002) → offering (BP-003) → optional quotation (BP-004) → commercial contract (BP-005) → sale/order (BP-006)**

Amount due is the BP-005 expected payable. Creating a sale is not payment. Inspection 80 / 15 / 5 leaves outstanding 20. Return + replace keeps 20; return + credit leaves 5. Downstream contracts carry quantities and amount due without collected tender or stock-on-hand.

BP-007 payment collection was **not** required to pass this record. BP-008 inventory may exist; sales must not write inventory state.

---

## 2. Journeys

| Journey | Result | Evidence |
|---------|--------|----------|
| J-01 Direct sale | PASS | direct-sale-confirm-with-snapshot, sod-maker-cannot-self-approve |
| J-02 Quote-to-order | PASS | quote-to-order-linked-not-owned-by-crm |
| J-03 Physical fulfilment + inspection | PASS | physical-80-15-5-outstanding-20, return-replace-keeps-outstanding-20, return-credit-leaves-outstanding-5 |
| J-04 Service delivery | PASS | service-complete-without-stock |
| J-05 Amendment / cancel / return | PASS | silent-amend-fails-cancel-instruction-only |
| J-06 Downstream contracts | PASS | downstream-contracts-no-collected-no-stock |
| J-07 Tenancy & fail-closed | PASS | tenancy-and-fail-closed |

### SoD users

| Role | User id |
|------|---------|
| Maker | `maker-1` |
| Checker / confirmer | `checker-1` |
| Inspector / service completer | `inspector-1` |

Maker cannot approve own confirmation, inspection, cancellation, return, or amendment when SoD applies.

### Commercial snapshot consumed (J-01)

| Field | Value |
|-------|-------|
| Order number | `SO-000001` |
| Expected amount | `300.000000` |
| Snapshot id | `95dfdb0c-62cc-4a39-b1ea-77c6d6b8ab08` |
| Commercial contract id | `c10-971d18fa` |

---

## 3. Traceability waves (RT-01…RT-11)

| Wave script | Result | Notes |
|-------------|--------|-------|
| bp006-ip01-sales-order-creation-smoke-validation.ts | PASS | spawned smoke |
| bp006-ip02-order-lifecycle-fulfilment-smoke-validation.ts | PASS | spawned smoke |
| bp006-ip03-delivery-inspection-service-smoke-validation.ts | PASS | spawned smoke |
| bp006-ip04-amendments-cancellation-returns-smoke-validation.ts | PASS | spawned smoke |
| bp006-ip05-downstream-handoff-sales-workspace-smoke-validation.ts | PASS | spawned smoke |

RT-12 is this record plus J-07 tenancy / fail-closed proofs.

---

## 4. Explicit non-ownership

| Capability | Proven absent in BP-006 |
|------------|-------------------------|
| Price/tax/discount engine | Sales does not call BP-003 pricing service or write `pricing_item` |
| Payment | No payment module; no cash/M-Pesa tender as system of record; collected amount null |
| Inventory | Sales does not mutate inventory ledger, balance, or reservation state. Fulfilment handoff is consumed by BP-008. `stockOnHand` null; `inventoryExecuted` false |
| Quotation master | Sales converts eligible quotations; it does not construct `QuotationService` |
| Bookings | `schedulerExecuted` remains false |

---

## 5. Known defects / waivers

| Item | Treatment |
|------|-----------|
| Live browser click-through | **Waiver.** Happy-path UX is proven by source language checks (Sell / Price a sale / Convert quote; no BP/IP labels) and IP-01–IP-05 smokes. Browser was not driven in this run. |
| Collected payment / split tender | **Not a defect.** Owned by BP-007. Recorded as not available; no payment data invented. |
| Stock movement / on-hand | **Not a defect.** Owned by BP-008. Instructions unexecuted. |
| Bookings / appointments | **Out of scope** for BP-006. |
| `bp001-004-system-integration-certification.ts` TS2367 (`leads`) | Pre-existing; outside BP-006. |

---

## 6. Sign-off

| Item | Value |
|------|-------|
| Role | Integration Manager |
| Decision | Approve progression toward BP-007. Do not start payment or inventory features inside BP-006. |
| Failed checks | None |
| Checks | 23/23 passed |

Do **not** start BP-007 until this record exists and status is CERTIFIED.
