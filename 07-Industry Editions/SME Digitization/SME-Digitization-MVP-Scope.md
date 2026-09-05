# SME Digitization MVP Scope

**Document ID:** IB-ED-SME-002  
**Version:** 1.0  
**Status:** AUTHORITATIVE — Launch 1 MVP freeze  
**Date:** 2026-09-03  
**Parent:** [SME Digitization Edition Definition](./SME-Digitization-Edition-Definition.md)

---

## 1. Purpose

Define the **minimum commercially meaningful** SME Digitization scope using scored journeys from the Journey Catalogue and implementation evidence.

Do **not** include every existing BP capability in MVP.

---

## 2. Scoring criteria

| Criterion | Weight | Guidance |
|-----------|--------|----------|
| Customer value | High | Can an end customer complete a valuable outcome? |
| Business value | High | Can the SME operate/grow digitally? |
| Existing implementation maturity | High | Prefer EXISTS / CERTIFIED domains |
| Dependency complexity | Medium | Prefer few new platform components |
| Channel readiness | High | Staff Web ready; Customer Web designed |
| Certification effort | Medium | Prefer paths with existing smoke/cert |
| Revenue / commercial importance | High | Checkout & payment critical |

Score: **H** / **M** / **L** relative to MVP inclusion.

---

## 3. Journey scoring matrix

| Journey | Cust | Biz | Maturity | Dep | Channel | Cert | Revenue | MVP class |
|---------|------|-----|----------|-----|---------|------|---------|-----------|
| J-PLT-001 Business onboarding | M | H | CERTIFIED | L | Ready | H | H | **SME MVP** |
| J-BIZ-001 Onboard customer | M | H | EXISTS | L | Staff ready | M | H | **SME MVP** |
| J-BIZ-002 Configure offering | M | H | EXISTS | L | Staff ready | M | H | **SME MVP** |
| J-STAFF-001 Process sale | M | H | CERTIFIED | L | Staff ready | H | H | **SME MVP** |
| J-STAFF-005 Collect payment | M | H | EXISTS | L | Staff ready | M | H | **SME MVP** |
| J-CUS-001 Purchase goods | H | H | Domain EXISTS / channel DESIGNED | M | Customer DESIGNED | L | H | **SME MVP** |
| J-CUS-007 Complete payment | H | H | Domain EXISTS | M | Customer DESIGNED | L | H | **SME MVP** (in SL-CUS-001) |
| Receipt delivery (customer) | H | H | Staff receipt EXISTS | M | Customer MISSING | L | H | **SME MVP** (minimal) |
| J-BIZ-003 Lead → quotation | L | M | CERTIFIED staff | L | Staff ready | H | M | **SME Phase 2** |
| J-STAFF-003 Receive inventory | L | M | EXISTS | L | Staff ready | M | M | **SME Phase 2** |
| J-STAFF-004 Procure goods | L | M | CERTIFIED | M | Staff ready | H | M | **SME Phase 2** |
| J-CUS-003 Request quotation | M | M | Domain EXISTS | M | Customer DESIGNED | L | M | **SME Phase 2** |
| J-CUS-004 Track order | M | M | Domain EXISTS | M | Customer DESIGNED | L | M | **SME Phase 2** |
| J-CUS-005 Pay invoice | M | M | Domain EXISTS | M | Customer DESIGNED | L | M | **SME Phase 2** |
| J-INT-001/002 Supplier token | L | M | PARTIAL | L | Token PARTIAL | M | L | **SME Phase 2** |
| J-CUS-002 Book service | M | M | Blocked ENG-018 | H | — | L | M | **SME Future** |
| J-CUS-006 Reorder | L | L | DESIGNED | M | — | L | L | **SME Future** |
| Expenses / cashbook | L | M | BP-010 MISSING | H | — | L | M | **SME Future** |
| Full ENG-003k edition UX | L | M | PARTIAL | M | — | L | L | **SME Future** |

---

## 4. SME MVP

### 4.1 Definition of MVP success

An SME can:

1. Onboard and configure the business (Staff / Platform Web)  
2. Set up offerings and prices  
3. Manage customers as Parties  
4. Process sales and payments on Staff Web  
5. Allow a **customer** to complete **browse → price → availability → create sale → pay → confirmation** on Customer Web  

### 4.2 MVP capability set

| Cap ID | Classification | Domain status | Channel status |
|--------|----------------|---------------|----------------|
| CAP-PLT-001–005 | SHARED_PLATFORM | EXISTS | EXISTS |
| CAP-BIZ-001–004 | SHARED_PLATFORM | EXISTS | Staff EXISTS |
| CAP-BIZ-010–012 | SHARED_PLATFORM | EXISTS | Staff EXISTS |
| CAP-BIZ-041, 052–053 | SHARED_PLATFORM | EXISTS / CERTIFIED | Staff EXISTS |
| CAP-BIZ-060–061 | SHARED_PLATFORM | EXISTS | Staff EXISTS |
| CAP-CUS-001, 002, 005 | SHARED_PLATFORM (expose) | Domain EXISTS | Customer **MISSING** |
| CAP-CUS-007, 010, 011, 016 | SHARED_PLATFORM (expose) | Domain EXISTS | Customer **MISSING** |
| Receipt evidence | SHARED_PLATFORM | EXISTS (BP-007) | Customer delivery **PARTIAL** |

### 4.3 MVP journeys

| Journey ID | Status class |
|------------|--------------|
| J-PLT-001 | CERTIFIED (reuse) |
| J-BIZ-001 | EXISTS (reuse) |
| J-BIZ-002 | EXISTS (reuse) |
| J-STAFF-001 | CERTIFIED (reuse) |
| J-STAFF-005 | EXISTS (reuse) |
| J-CUS-001 | DESIGNED — **must implement** |
| J-CUS-007 | DESIGNED — **must implement** (within SL-CUS-001) |

### 4.4 MVP slices

| Slice ID | Role |
|----------|------|
| SL-PLT-001 | Reuse — already certified |
| SL-STAFF-001 | Reuse — already implemented |
| SL-ENG-003o-002 | **NEW** — Customer Web foundation |
| SL-CUS-001 | **NEW** — first customer vertical slice |

### 4.5 Explicitly out of MVP

- Full procurement RFX depth as customer-facing  
- Customer quotation request  
- Bookings / appointments  
- WhatsApp / PWA  
- Property / NGO / School domains  
- BP-010 Finance  
- Expenses / cashbook  
- Full CRM campaign/case suites as MVP gates  

---

## 5. SME Phase 2

| Item | Rationale |
|------|-----------|
| J-BIZ-003 / J-CUS-003 Quotation paths | B2B SME value; domains exist |
| J-STAFF-003 / J-STAFF-004 Inventory receive & procurement | Ops completeness for wholesale |
| J-CUS-004 Track order | Post-purchase UX |
| J-CUS-005 Pay invoice | Staff-created obligation → customer pay |
| J-INT-001/002 Supplier token hardening | Already partial |
| Receipt / notification production adapters | ENG-009 live delivery |

---

## 6. SME Future

| Item | Blocker |
|------|---------|
| J-CUS-002 Book service | ENG-018 VISION |
| J-CUS-006 Reorder | After SL-CUS-001 |
| WhatsApp commerce (SL-WA-001) | After Customer Web certified |
| PWA | Presentation only |
| Expenses / GL | BP-010 MISSING |
| Full Industry Experience packaging | ENG-003k PARTIAL |

---

## 7. MVP capability count (summary)

| Bucket | Count (approx.) | Notes |
|--------|-----------------|-------|
| Existing / certified (staff) | ~25 | Workspace + sales/procurement certified paths |
| Existing / partial (customer expose) | 7 | Runtime caps for commerce |
| New required (channel/IAM/policy only) | 5–8 components | Not new BPs |
| Future | Industry CAP-IND-* + booking + GL | Not MVP |

Exact new capabilities: **no new CAP-IND / SME_SPECIFIC caps required**. New work is **channel exposure** of existing catalogue capabilities.

---

## 8. MVP journey count (summary)

| Status | Count |
|--------|-------|
| CERTIFIED / EXISTS (reuse in MVP) | 5 |
| DESIGNED (must build for MVP) | 2 (J-CUS-001, J-CUS-007) |
| Phase 2 | 6+ |
| Future | 3+ |

---

*No production code authorized by this document.*
