# SL-CUS-001 — Customer Web Goods Purchase

**Document ID:** IB-ED-SME-SL-CUS-001  
**Version:** 1.0  
**Status:** AUTHORITATIVE — Implementation Requirements  
**Date:** 2026-09-03  
**Slice:** SL-CUS-001  
**Prerequisite:** SL-ENG-003o-002 (CERTIFIED)

---

## 1. Document Control

| Field | Value |
|-------|-------|
| Owner | SME Digitization Launch 1 |
| Parent | [SME-Digitization-Slice-Register.md](./SME-Digitization-Slice-Register.md) |
| Governing model | IB-ARCH-CHN-001 / IB-ARCH-CHN-002 |
| Engine | ENG-003o |
| Implementation package | `03-platform/src/core/channel-experience/customer/` + storefront routes |

---

## 2. Slice Identity

| Attribute | Value |
|-----------|-------|
| **Slice ID** | SL-CUS-001 |
| **Name** | Customer Web Goods Purchase |
| **Type** | End-to-end customer commercial vertical slice |
| **Horizon** | SME MVP Launch 1 |

---

## 3. Governing Documents

- `07-Industry Editions/00-InverBrass Master Capability, Industry, Journey & Slice Model.md`
- `07-Industry Editions/02-Master-Registers-and-Traceability-Inventory.md`
- `07-Industry Editions/SME Digitization/SME-Digitization-Edition-Definition.md`
- `07-Industry Editions/SME Digitization/SME-Digitization-MVP-Scope.md`
- `07-Industry Editions/SME Digitization/SME-Digitization-Journey-Map.md`
- `07-Industry Editions/SME Digitization/SME-Digitization-Slice-Register.md`
- `07-Industry Editions/SME Digitization/SME-Edition-Gap-and-Decision-Register.md`
- `01-enterprise-architecture/15-ENG-003o-Channel-Experience-Engine.md`

---

## 4. Business Objective

Enable an SME retail customer to complete **browse → price → availability → cart → checkout → pay → confirmation/receipt** on Customer Web using existing shared platform domains — without a parallel customer ERP.

---

## 5. Industry

`IND-SME` / `IND-COM` (Retail primary)

---

## 6. Business Type

`RETAIL` (MVP primary)

---

## 7. Edition

`ED-SME-001` — SME Digitization Edition

---

## 8. Actor

| Actor | Mode |
|-------|------|
| Customer (guest) | **Primary (D-01)** |
| Customer (authenticated) | Optional — same allow-list; Party bind may be `PENDING_IAM` |

Customer is **not** a staff user. No staff RBAC.

---

## 9. Journey

**J-CUS-001** Purchase Goods (+ **J-CUS-007** Complete payment within same slice)

---

## 10. Capabilities

| Cap ID | Runtime ID | Access |
|--------|------------|--------|
| CAP-CUS-001 | `OFFERING_VIEW` | Allow |
| CAP-CUS-002 | `PRICE_QUERY` | Allow |
| CAP-CUS-005 | `STOCK_AVAILABILITY_QUERY` | Allow |
| CAP-CUS-006 | Session cart | Session only (D-03, D-05) |
| CAP-CUS-007 | `CREATE_SALE` | Allow |
| CAP-CUS-010 | `INITIATE_PAYMENT` | Allow |
| CAP-CUS-011 | `VIEW_ORDER` | Allow |
| CAP-CUS-016 | `VIEW_PAYMENT_STATUS` | Allow |

**Deny (non-exhaustive):** all `*_WORKSPACE`, procurement, supplier, inventory mutation, pricing admin, payment admin, configuration, approval, user admin, finance admin.

**Policy:** deny-by-default (`evaluateCustomerWebPolicy`).

---

## 11. Channel

**CH-CUST** — Customer Web presentation profile over runtime channel `WEB`.

Route root: `/store/[businessCode]`

---

## 12. Domain Ownership

| Domain | Owner | Customer Web role |
|--------|-------|-------------------|
| Offering/catalogue | BP-003 | Read published offerings |
| Price | BP-005 | Authoritative resolution |
| Availability | BP-008 | Read-only query |
| Sale/order | BP-006 | `createDirectSale` + confirm |
| Payment | BP-007 | Obligation + initiation |
| Receipt/evidence | BP-007 / ENG-007 | Customer-safe view |
| Party | BP-002 | Guest party at checkout |

No new domain. No Customer Web DB writes to domain tables.

---

## 13. Build Pack Ownership

BP-003, BP-005, BP-006, BP-007, BP-008, BP-002 (minimal guest party)

---

## 14. Engine Dependencies

| Engine | Role |
|--------|------|
| ENG-003o | Customer gateway, policy, session, adapter |
| ENG-006 | Payment engine (via BP-007) |
| ENG-013 | Audit correlation |
| ENG-007 | Receipt document (via BP-007 IP-05) |

---

## 15. Preconditions

| Precondition | Status |
|--------------|--------|
| SL-ENG-003o-002 certified | **MET** |
| Staff ENG-003o smoke | **MET** |
| Domain services exist | **MET** |
| BP-006 CREATE_SALE idempotency | **Required by this slice** |

---

## 16. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-01 | Browse customer-visible published catalogue for tenant |
| FR-02 | View customer-safe price per offering (server authoritative) |
| FR-03 | View customer-safe availability |
| FR-04 | Session cart add/update/remove (D-03) |
| FR-05 | Checkout revalidates price and availability |
| FR-06 | CREATE_SALE via domain service with mandatory idempotency |
| FR-07 | Auto-confirm customer sale (SoD bypass for customer channel policy instance) |
| FR-08 | Create payment obligation + initiate payment |
| FR-09 | View own order/payment/receipt with resource scoping |
| FR-10 | Guest party provision at checkout (BP-002) |

---

## 17. Customer Web Journey

```text
/store/[businessCode]
  → Catalogue (OFFERING_VIEW)
  → Product detail + price + stock
  → Cart (session)
  → Checkout
  → CREATE_SALE (idempotent)
  → INITIATE_PAYMENT
  → Purchase result (VIEW_ORDER, VIEW_PAYMENT_STATUS, receipt evidence)
```

---

## 18. Customer Trust Boundary

Every server action/route handler MUST:

1. Resolve tenant from URL `businessCode` (never staff cookie)
2. Load/bind guest session cookie
3. Build customer identity (no staff grants)
4. Invoke `invokeCustomerWebCapability` with pre-resolved context
5. Bridge to domain `CurrentBusinessContext` via `buildCustomerDomainContext` (tenant-scoped synthetic actor — not staff membership)

**BLOCKER-01:** Must pass certification.

---

## 19. Tenant Resolution

- Mechanism: `/store/[businessCode]` → ACTIVE `business.code` lookup
- Invalid/inactive: safe deny (404 customer message)
- Session tenant mismatch: 403 deny
- Staff business-context cookie: **must not override**

---

## 20. Customer Identity Model

| State | actorType | Party |
|-------|-----------|-------|
| Guest | ANONYMOUS | Created at checkout; `partyId` stored on session |
| Authenticated | CUSTOMER | Session `partyId` or `PENDING_IAM` |

No second customer master. No staff RBAC identity.

---

## 21. Guest Session Model

Reuse SL-ENG-003o-002: HMAC HttpOnly cookie, path `/store`, opaque UUID, rotation on bootstrap.

Cart stored in session payload.

---

## 22. Customer Authorization Policy

Reuse `evaluateCustomerWebPolicy` + `CustomerWeb.*` grants. Staff `permissionCodes` ignored.

---

## 23. Resource Authorization / Object Scoping

Order/payment/receipt reads MUST verify:

- `businessId` match
- `guestSessionId` in order metadata OR `partyId` match

Guessed IDs → authorization failure (no existence leak).

**BLOCKER-02:** Must pass certification.

---

## 24. Cart Model

Session-only (`customer/cart.ts`). Not a BP-006 entity.

---

## 25. Checkout

Server re-reads price (`prepareCommercial` / resolver) and availability before CREATE_SALE.

Stale price → explicit `PRICE_CHANGED` response.  
Stale stock → explicit `AVAILABILITY_CHANGED` response.

---

## 26. CREATE_SALE Contract

Input via BP-006 `CreateDirectSaleInput` + mandatory `idempotencyKey` + `idempotencyPayloadHash` + `channelMetadata`:

```json
{
  "customerWeb": {
    "guestSessionId": "...",
    "correlationId": "...",
    "channelSource": "CUSTOMER_WEB"
  }
}
```

---

## 27. Purchase Idempotency

**BLOCKER-03:** Domain-level enforcement in BP-006 `createDirectSale`:

- Key required for customer path
- Missing key → reject
- Same key + same hash → replay original order
- Same key + different hash → reject
- Concurrent duplicate → one sale
- Scope: `businessId` + operation + key

Registry: `sales_idempotency` table (mirrors payment pattern).

Channel namespace: `customer-web:create-sale:{guestSessionId}:{clientKey}`

---

## 28. Inventory/Availability Integration

Read-only via BP-008 `listAvailability`. No customer mutation.

---

## 29. Payment Integration

BP-007: `createObligation` → `initiatePayment` with idempotency keys derived from sale idempotency scope.

---

## 30. Receipt/Purchase Evidence (D-06)

Customer-safe receipt/purchase evidence on success path. External delivery (email/SMS/WhatsApp) **out of scope**.

---

## 31. Order/Payment Status

Customer-safe views: reference, date, items, amounts, statuses. No internal workflow metadata.

---

## 32. Error Handling

Customer-readable errors only. No stack traces, SQL, internal IDs, tenant UUIDs in responses. Authorization failures generic.

---

## 33. Concurrency

Test: duplicate idempotency key, concurrent CREATE_SALE, stale cart, payment retry.

---

## 34. Audit and Correlation

Propagate `correlationId` from customer gateway through domain writes. ENG-013 audit on domain services.

---

## 35. Security Invariants

- No staff RBAC on customer path
- No client-authoritative tenant/price/stock/auth
- No unrestricted GET by ID
- No channel-only idempotency
- No cross-tenant fallback

---

## 36. UX Requirements

Mobile-first simple storefront: catalogue, detail, cart, checkout, result. Guest-first. Brand/store name visible.

---

## 37. Non-Goals

WhatsApp, Messenger, Instagram, AI, native app, public REST API, loyalty, bookings, Property, NGO, Chama, quotation workflow, broad customer IAM redesign.

---

## 38. Acceptance Criteria

| AC | Criterion |
|----|-----------|
| AC-01 | Full journey on `/store/[businessCode]` for seeded ACTIVE business |
| AC-02 | BLOCKER-01/02/03 certification PASS |
| AC-03 | Staff ENG-003o + foundation smoke PASS |
| AC-04 | Typecheck + build PASS |
| AC-05 | Customer DTOs contain no forbidden fields |

---

## 39. Certification Requirements

Script: `03-platform/scripts/sl-cus-001-customer-web-goods-purchase-certification.ts`  
Closure helpers: `sl-cus-001-certification-closure.ts`, `sl-cus-001-live-e2e.ts`

Sections A–M. Slice **CERTIFIED** only if all mandatory gates pass.

---

## 40. Traceability

```text
SME Digitization → Customer → J-CUS-001 → Customer Web → SL-CUS-001
→ OFFERING_VIEW | PRICE_QUERY | STOCK_AVAILABILITY_QUERY | CREATE_SALE
  | INITIATE_PAYMENT | VIEW_ORDER | VIEW_PAYMENT_STATUS
→ ENG-003o → BP-003/005/006/007/008 → certification
```

---

## 41. Implementation Checklist

- [x] Requirements document (this file)
- [x] BP-006 sales idempotency registry + service integration
- [x] Customer commerce service + actions
- [x] Guest party provisioning
- [x] Resource scoping on order/payment/receipt reads
- [x] Customer-safe commerce DTOs
- [x] Storefront routes
- [x] Certification script (live DB + E2E + concurrency)
- [x] Register updates

---

## 42. Out-of-Scope Items

External receipt delivery, customer account IAM hardening beyond checkout party, Property/NGO editions, conversational channels.

---

## 43. Open Questions / Decisions

| ID | Status |
|----|--------|
| D-01 Guest-first | **APPROVED** |
| D-02 `/store/[businessCode]` | **APPROVED** |
| D-03 Session cart | **APPROVED** |
| D-04 CustomerWeb grants | **APPROVED** |
| D-06 Receipt in completion | **APPROVED** (view only; no external delivery) |
| Customer SoD bypass for auto-confirm | **Approved for slice** — customer sales service uses `requiresSegregationOfDuties: false` policy instance only on customer orchestration path |

---

## 44. Final Certification Record

| Field | Value |
|-------|-------|
| Certification Date | 2026-09-03 |
| Implementation Version / Commit | `a747c26` (develop working tree at certification) |
| Test Environment | Local development DB (`.env.local`) + `03-platform` Next app |
| Migration Applied | `drizzle/0094_bp006_sl_cus_001_sales_idempotency.sql` — **PASS** |
| Seeded E2E | Controlled fixture on `TASHALTD-58CC76` (activate pricing catalogue, stock opening, WEBSITE pubs) — **PASS** |
| Concurrency Tested | 8× simultaneous CREATE_SALE same key (in-memory idempotency store) — **PASS** |
| Payment Tested | Live BP-007 initiation (CASH / manual path) — **PASS** (`SUCCESSFUL`) |
| Receipt Tested | Customer-safe purchase evidence `receiptAvailable=true` — **PASS** |
| Security Tested | BLOCKER-01/02 trust + resource auth + policy deny staff/procurement — **PASS** |
| Regression Tested | Foundation 33/33; ENG-003o staff smoke; BP-006 50/50; BP-007 53/53; BP-008 IP-01 47/47; typecheck; eslint; production build — **PASS** |
| Certification totals | **73 PASS / 0 FAIL / 4 NA** |

### NA reasons (honest)

1. Stale price handled (cart section) — no client price field; server re-resolves; live price-mutation race not separately harnessed  
2. Stale availability handled (cart section) — `assertProductAvailable` exists; multi-actor sell-out race not separately harnessed  
3. Stale price client override field — checkout API has no client price/tenant/party fields  
4. Stale availability after concurrent sell-out — requires multi-actor stock race harness beyond this pass  

### Idempotency uniqueness scope

`UNIQUE (business_id, operation_type, idempotency_key)` on `sales_idempotency`  
Same key allowed across tenants; same key + different payload hash → conflict.

### Certification Result

**CERTIFIED**

SL-CUS-001 is CERTIFIED and may proceed to the next governed implementation slice.
