# SME Digitization Journey Map

**Document ID:** IB-ED-SME-003  
**Version:** 1.0  
**Status:** AUTHORITATIVE  
**Date:** 2026-09-03  
**Parent:** [SME Digitization Edition Definition](./SME-Digitization-Edition-Definition.md)  
**Source catalogue:** [Master Registers §3](../02-Master-Registers-and-Traceability-Inventory.md)

---

## 1. Purpose

Map SME Digitization journeys by actor and horizon (MVP / Phase 2 / Future), with capability and channel traceability.

---

## 2. Journey map overview

```text
                    SME DIGITIZATION EDITION
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
   BUSINESS OWNER          STAFF               CUSTOMER
         │                    │                    │
   J-PLT-001             J-STAFF-*             J-CUS-*
   J-BIZ-001/002         (ops)                 (commerce)
```

---

## 3. Business setup journeys

| Journey ID | Steps (summary) | Capabilities | Channel | Horizon | Status |
|------------|-----------------|--------------|---------|---------|--------|
| **J-PLT-001** | Register → authenticate → select/create business → configure → activate | CAP-PLT-001–005 | Platform Web | **MVP** | **CERTIFIED** |
| **J-BIZ-002** | Create offering → price → publish/catalogue | CAP-BIZ-010–012 | Staff Web | **MVP** | **EXISTS** |
| User/role setup | Invite staff → assign roles | CAP-PLT-005 | Staff Web | **MVP** | **EXISTS** |
| Pricing / commercial config | Tax/discount policies | CAP-BIZ-030–032 | Staff Web | **MVP** (basic) | **EXISTS** |

---

## 4. Staff operations journeys

| Journey ID | Steps (summary) | Capabilities | Channel | Horizon | Status |
|------------|-----------------|--------------|---------|---------|--------|
| **J-BIZ-001** | Create/find Party → assign CUSTOMER role → contacts | CAP-BIZ-001–004 | Staff Web | **MVP** | **EXISTS** |
| **J-STAFF-001** | Create direct sale → fulfilment handoff → stock reservation | CAP-BIZ-041, 062 | Staff Web | **MVP** | **CERTIFIED** |
| **J-STAFF-005** | Obligation → initiate payment → allocate/receipt | CAP-BIZ-051–053 | Staff Web | **MVP** | **EXISTS** |
| **J-STAFF-003** | Receive stock / opening balances | CAP-BIZ-061 | Staff Web | **Phase 2** | **EXISTS** |
| **J-STAFF-004** | PR → RFX → PO → receive → invoice | CAP-BIZ-072–075 | Staff Web | **Phase 2** | **CERTIFIED** |
| **J-BIZ-003** | Lead → opportunity → quotation | CAP-BIZ-021–025 | Staff Web | **Phase 2** | **CERTIFIED** |

---

## 5. Customer commerce journeys

### 5.1 MVP — J-CUS-001 Purchase Goods

```text
Discover business (/store/[businessCode])
      ↓
Browse offering          CAP-CUS-001  OFFERING_VIEW
      ↓
View offering            CAP-CUS-001  OFFERING_VIEW
      ↓
View price               CAP-CUS-002  PRICE_QUERY
      ↓
Check availability       CAP-CUS-005  STOCK_AVAILABILITY_QUERY
      ↓
Select quantity / cart   CAP-CUS-006  (session — NEEDS_DECISION)
      ↓
Create sale              CAP-CUS-007  CREATE_SALE
      ↓
Initiate payment         CAP-CUS-010  INITIATE_PAYMENT
      ↓
View payment status      CAP-CUS-016  VIEW_PAYMENT_STATUS
      ↓
Order confirmation       CAP-CUS-011  VIEW_ORDER
      ↓
Receipt evidence         BP-007 receipt (customer delivery PARTIAL)
```

| Attribute | Value |
|-----------|-------|
| Industry | IND-SME / IND-COM |
| Business type | `RETAIL` (primary) |
| Actor | Customer (guest-first) |
| Channel | Customer Web |
| Domains | BP-003, BP-005, BP-006, BP-007, BP-008 |
| Engine | ENG-003o (+ ENG-006, ENG-013) |
| Slice | **SL-CUS-001** |
| Horizon | **SME MVP** |
| Status | **CERTIFIED** (SL-CUS-001 2026-09-03) — domain + Customer Web foundation + storefront E2E |

### 5.2 Other customer journeys

| Journey ID | Horizon | Status | Notes |
|------------|---------|--------|-------|
| J-CUS-007 Complete payment | MVP (inside SL-CUS-001) | DESIGNED | Same payment path |
| J-CUS-003 Request quotation | Phase 2 | **CERTIFIED** | SL-CUS-003 54/0/0 (2026-09-04) |
| J-CUS-004 Track order | Phase 2 | **CERTIFIED** | CAP-CUS-011/016 — CRM Case deferred; SL-CUS-004 36/0/0 (2026-09-04) |
| J-CUS-005 Pay existing obligation | Phase 2 | **IMPLEMENTED** | SL-CUS-005 — live certification pending pooler recovery |
| J-CUS-002 Book service | Future | DESIGNED | Blocked ENG-018 |
| J-CUS-006 Reorder | Future | DESIGNED | After MVP |

---

## 6. Financial operations (journey view)

| Outcome | Staff path | Customer path | Horizon |
|---------|------------|---------------|---------|
| Initiate payment | J-STAFF-005 EXISTS | J-CUS-001 / J-CUS-007 DESIGNED | MVP |
| Billing / invoice | BP-007 EXISTS | Customer view Phase 2 | Phase 2 |
| Receivables | Staff payment workspace EXISTS | — | Phase 2 |
| Receipt | Staff EXISTS | Customer delivery PARTIAL | MVP minimal |
| Expenses / cashbook | BP-010 MISSING | — | Future |

---

## 7. Customer management journeys

| Outcome | Journey / Cap | Horizon | Status |
|---------|---------------|---------|--------|
| Create customer Party | J-BIZ-001 | MVP | EXISTS |
| Customer history / C360 | CRM workspace | Phase 2 as MVP gate | EXISTS (staff) |
| Catalogue browse (customer) | J-CUS-001 | MVP | DESIGNED |

---

## 8. Journey × channel matrix (SME)

| Journey | Platform Web | Staff Web | Customer Web | Token | WhatsApp |
|---------|--------------|-----------|--------------|-------|----------|
| J-PLT-001 | ✓ | — | — | — | — |
| J-BIZ-001/002 | — | ✓ | — | — | — |
| J-STAFF-001/005 | — | ✓ | — | — | — |
| J-STAFF-003/004 | — | ✓ Phase 2 | — | — | — |
| J-CUS-001 | — | — | ✓ MVP | — | Future |
| J-CUS-003/004/005 | — | — | Phase 2 | — | Future |
| J-INT-001/002 | — | — | — | ✓ Phase 2 | — |

---

## 9. Journey count by horizon

| Horizon | Journeys |
|---------|----------|
| **SME MVP** | J-PLT-001, J-BIZ-001, J-BIZ-002, J-STAFF-001, J-STAFF-005, J-CUS-001, J-CUS-007 |
| **SME Phase 2** | J-BIZ-003, J-STAFF-003, J-STAFF-004, J-CUS-003, J-CUS-004, J-CUS-005, J-INT-001/002 |
| **SME Future** | J-CUS-002, J-CUS-006 |

---

*No production code authorized by this document.*
