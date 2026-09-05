# SME Digitization Edition Definition

**Document ID:** IB-ED-SME-001  
**Version:** 1.0  
**Status:** AUTHORITATIVE — Launch 1 Edition Definition  
**Date:** 2026-09-03  
**Parent:** [Industry Launch Portfolio](../Industry-Launch-Portfolio.md)  
**Registers:** [02 – Master Registers](../02-Master-Registers-and-Traceability-Inventory.md)  
**Governing model:** [IB-ARCH-CHN-001](../00-InverBrass%20Master%20Capability,%20Industry,%20Journey%20&%20Slice%20Model.md)

---

## 1. Purpose

Formally define the **SME Digitization Edition** as **Launch 1** of InverBrass.

This edition composes the **existing shared platform** (BP-001–BP-009 + ENG-003o) for African SMEs. It does **not** create a separate SME ERP or duplicate domain masters.

---

## 2. Edition identity

| Attribute | Value |
|-----------|-------|
| Edition name | SME Digitization Edition |
| Edition ID | **ED-SME-001** |
| Catalog alignment | Cross-cutting SME audience; consumes VS-001 Retail foundation + generic SME template |
| Launch | **Launch 1** |
| Maturity | **PARTIALLY IMPLEMENTED** |
| Evidence | Staff Web BP-001–009 live; BP-006 & BP-009 certified; Customer Web **DESIGNED** only |

---

## 3. Industry & business types

### Primary industry

| Industry ID | Name | Seed | Role in edition |
|-------------|------|------|-----------------|
| **IND-SME** | SME / General Business | Primary audience | Default edition framing |
| **IND-COM** | Commerce & Trade | `COMMERCE` | Primary goods commerce path |

### SME business types in scope (seeded)

| Code | Name | MVP priority |
|------|------|--------------|
| `RETAIL` | Retail | **MVP primary** (goods purchase) |
| `WHOLESALE` | Wholesale | MVP (ops + procurement) |
| `RESTAURANT` | Restaurant | Phase 2 (services/booking limited) |
| `HOTEL` | Hotel | Future (reservations blocked) |
| `PHARMACY` | Pharmacy | Phase 2 (compliance later) |
| `CLINIC` | Clinic | Future (clinical domain missing) |
| Generic SME | Default onboarding | MVP |

### Explicitly out of this edition (other launches)

| Industry / type | Launch |
|-----------------|--------|
| Property Manager / Estate Agent | Launch 2 |
| NGO / Programme | Launch 3 |
| School / College as Education Edition | Future (not Launch 1–3 priority) |
| Chama finance domain | Future |

---

## 4. Target customer

| Attribute | Definition |
|-----------|------------|
| Primary | Small and medium enterprises digitizing sales, inventory, payments, and customer management |
| Geography | African market (mobile-first, multi-tenant SaaS) |
| Offering model | Physical goods, services, or both — **without** industry-specific clinical/property/programme domains |
| Pain addressed | Cost and complexity of traditional ERP; lack of digital customer commerce channel |

---

## 5. Actors

### Primary actors

| Actor | Description | Channel |
|-------|-------------|---------|
| **Business Owner / Admin** | Onboards business, configures offerings, users, payments | Platform Web + Staff Web |
| **Staff** | Day-to-day sales, inventory, CRM, procurement, payments | Staff Web |
| **Customer** | Browses, buys, pays, views order/payment status | Customer Web (MVP target) |

### Secondary actors

| Actor | Description | Channel |
|-------|-------------|---------|
| **Supplier** | Responds to RFX / accepts PO | Token Web (exists) |
| **Platform Admin** | Tenant/platform governance | Platform Admin (out of SME MVP) |

---

## 6. Business objectives

| ID | Objective | Success signal |
|----|-----------|----------------|
| OBJ-SME-01 | Digitize SME business setup without specialist ERP staff | J-PLT-001 completed |
| OBJ-SME-02 | Operate catalogue, sales, inventory, payments from one Staff Web | SL-STAFF-001 usable |
| OBJ-SME-03 | Enable end customer to purchase goods and pay online | SL-CUS-001 certified |
| OBJ-SME-04 | Preserve domain ownership (no channel-owned logic) | ENG-003o + BP contracts |
| OBJ-SME-05 | Prove shared platform can later serve Property/NGO editions | Reuse matrix documented |

---

## 7. Core operational areas

| Area | In SME Edition | MVP? |
|------|----------------|------|
| Business onboarding & configuration | Yes | Yes |
| Party / customer / supplier identity | Yes | Yes |
| Product & service catalogue | Yes | Yes |
| Pricing & commercial rules | Yes | Yes |
| CRM / quotations | Yes | Partial (staff yes; customer quote Phase 2) |
| Sales & fulfilment | Yes | Yes (staff); Customer Web MVP |
| Payments / billing / receipting | Yes | Yes |
| Inventory | Yes | Yes (staff); availability query for customer |
| Procurement & suppliers | Yes | Phase 2 for full buy-side depth |
| Expenses / cashbook / GL | Limited | Future (BP-010 **MISSING**) |
| Bookings / appointments | No (ENG-018 **VISION**) | Future |

---

## 8. Capability classification

Every capability is classified as:

1. **SHARED_PLATFORM** — certified/existing shared BP capability  
2. **SME_CONFIGURATION_OF_SHARED_CAPABILITY** — same capability, SME template/config  
3. **SME_SPECIFIC_CAPABILITY** — only if shared cannot satisfy (none for MVP)  
4. **FUTURE_CAPABILITY** — planned  
5. **NOT_REQUIRED_FOR_SME_MVP** — deferred

### Default rule

> Reuse a certified/existing shared platform capability through configuration before creating an SME-specific capability.

### 8.1 Platform & setup

| Cap ID | Capability | Classification | Status |
|--------|------------|----------------|--------|
| CAP-PLT-001 | Register business | SHARED_PLATFORM | EXISTS |
| CAP-PLT-002 | Authenticate user | SHARED_PLATFORM | EXISTS |
| CAP-PLT-003 | Select business context | SHARED_PLATFORM | EXISTS |
| CAP-PLT-004 | Configure business settings | SME_CONFIGURATION_OF_SHARED_CAPABILITY | EXISTS |
| CAP-PLT-005 | Manage staff membership | SHARED_PLATFORM | EXISTS |

### 8.2 Party / CRM

| Cap ID | Capability | Classification | Status |
|--------|------------|----------------|--------|
| CAP-BIZ-001–008 | Party management suite | SHARED_PLATFORM | EXISTS |
| CAP-BIZ-020–026 | CRM suite | SHARED_PLATFORM | EXISTS |
| CAP-CUS-008 | Request quotation (customer) | SHARED_PLATFORM (channel expose) | **IMPLEMENTED** (SL-CUS-003) |

### 8.3 Catalogue / commercial

| Cap ID | Capability | Classification | Status |
|--------|------------|----------------|--------|
| CAP-BIZ-010–014 | Product / offering ops | SHARED_PLATFORM | EXISTS |
| CAP-BIZ-030–032 | Commercial / tax | SHARED_PLATFORM | EXISTS |
| CAP-CUS-001 | View / browse offering | SHARED_PLATFORM (channel expose) | REGISTERED / PARTIAL |
| CAP-CUS-002 | Query price | SHARED_PLATFORM (channel expose) | PARTIAL |
| CAP-CUS-005 | Check availability | SHARED_PLATFORM (channel expose) | PARTIAL |

### 8.4 Sales / payments / inventory / procurement

| Cap ID | Capability | Classification | Status |
|--------|------------|----------------|--------|
| CAP-BIZ-040–044 | Sales ops | SHARED_PLATFORM | EXISTS / CERTIFIED |
| CAP-CUS-007 | Create sale (customer) | SHARED_PLATFORM (channel expose) | PARTIAL |
| CAP-CUS-011 | View order | SHARED_PLATFORM (channel expose) | PARTIAL |
| CAP-BIZ-050–053 | Payment ops | SHARED_PLATFORM | EXISTS |
| CAP-CUS-010 | Initiate payment | SHARED_PLATFORM (channel expose) | PARTIAL |
| CAP-CUS-016 | View payment status | SHARED_PLATFORM (channel expose) | PARTIAL |
| CAP-BIZ-060–063 | Inventory ops | SHARED_PLATFORM | EXISTS |
| CAP-BIZ-070–075 | Procurement ops | SHARED_PLATFORM | EXISTS / CERTIFIED |
| CAP-INT-001–002 | Supplier token | SHARED_PLATFORM | PARTIAL |

### 8.5 Channel infrastructure

| Cap ID | Capability | Classification | Status |
|--------|------------|----------------|--------|
| CAP-PLT-010–013 | Gateway, registry, staff identity | SHARED_PLATFORM | EXISTS / PARTIAL |
| CAP-PLT-014 | Customer identity resolution | SHARED_PLATFORM | DESIGNED / MISSING |
| CAP-PLT-015 | Session / correlation | SHARED_PLATFORM | PARTIAL |
| CAP-PLT-016 | Intent mapping | FUTURE_CAPABILITY | REGISTERED |

### 8.6 Explicitly not SME-specific for MVP

| Cap ID | Capability | Classification |
|--------|------------|----------------|
| CAP-IND-001–003 | School | FUTURE_CAPABILITY / NOT_REQUIRED_FOR_SME_MVP |
| CAP-IND-010–011 | NGO programmes | FUTURE_CAPABILITY (Launch 3) |
| CAP-IND-020–021 | Chama | FUTURE_CAPABILITY |
| CAP-IND-030–031 | Property | FUTURE_CAPABILITY (Launch 2) |

**SME_SPECIFIC_CAPABILITY count for MVP: 0**

---

## 9. Core journeys (edition view)

| Journey ID | Name | Actor | MVP class |
|------------|------|-------|-----------|
| J-PLT-001 | Register & activate business | Business Owner | **SME MVP** |
| J-BIZ-001 | Onboard customer (party) | Staff | **SME MVP** |
| J-BIZ-002 | Configure offering | Staff | **SME MVP** |
| J-STAFF-001 | Process customer sale | Staff | **SME MVP** |
| J-STAFF-005 | Collect customer payment | Staff | **SME MVP** |
| J-CUS-001 | Purchase goods | Customer | **SME MVP** |
| J-CUS-007 | Complete payment (checkout) | Customer | **SME MVP** (part of SL-CUS-001) |
| J-BIZ-003 | Lead → quotation | Staff | **SME Phase 2** |
| J-STAFF-003 | Receive inventory | Staff | **SME Phase 2** |
| J-STAFF-004 | Procure goods | Staff | **SME Phase 2** |
| J-CUS-003 | Request quotation | Customer | **SME Phase 2** |
| J-CUS-004 | Track order | Customer | **SME Phase 2** |
| J-CUS-002 | Book service | Customer | **SME Future** |
| J-CUS-006 | Reorder goods | Customer | **SME Future** |

See [SME Digitization Journey Map](./SME-Digitization-Journey-Map.md).

---

## 10. Candidate channels

| Channel | Role in SME Edition | Status |
|---------|---------------------|--------|
| Platform Web | Onboarding | EXISTS |
| Staff Web | Operations | IMPLEMENTED |
| Customer Web | Commerce | DESIGNED — Launch 1 MVP |
| Supplier Token Web | Buy-side collaboration | PARTIAL — Phase 2 |
| PWA / WhatsApp / API | Expansion | VISION — after SL-CUS-001 |

---

## 11. Supporting Build Packs & engines

### Build Packs

| BP | Role | Status |
|----|------|--------|
| BP-001 | Setup | IMPLEMENTED |
| BP-002 | Party | IMPLEMENTED |
| BP-003 | Offerings | IMPLEMENTED |
| BP-004 | CRM | IMPLEMENTED |
| BP-005 | Commercial | IMPLEMENTED |
| BP-006 | Sales | CERTIFIED |
| BP-007 | Payments | IMPLEMENTED |
| BP-008 | Inventory | IMPLEMENTED |
| BP-009 | Procurement | CERTIFIED |
| BP-010 | Finance / GL | MISSING — Future |

### Engines (supporting)

| Engine | Role | Status |
|--------|------|--------|
| ENG-001 / ENG-002 | Auth / RBAC | EXISTS |
| ENG-003a / 003k | Config / Industry Experience | PARTIAL |
| ENG-003o | Channel & Experience | PARTIAL (staff yes; customer no) |
| ENG-005 | Workflow | EXISTS |
| ENG-006 | Payment engine | EXISTS |
| ENG-007 | Receipting | EXISTS |
| ENG-013 | Audit | EXISTS |
| ENG-015 | Documents | PARTIAL |
| ENG-018 | Scheduling | VISION — not MVP |

---

## 12. Existing certified / evidence-backed capabilities

| Evidence | Scope |
|----------|-------|
| BP-001–004 system integration certification | Business → Party → Product → CRM journeys |
| BP-006 Sales certification | Staff sales lifecycle |
| BP-009 Procurement certification (359/359) | Full buy-side staff path |
| BP-005 IP smokes | Commercial resolution |
| ENG-003o smoke | Staff gateway reference |

**Do not mark Customer Web capabilities CERTIFIED without evidence** — SL-CUS-001 certified 2026-09-03 (73/0/4).

---

## 13. Missing capabilities (edition gaps)

| Gap | Type | Blocks MVP? |
|-----|------|-------------|
| Customer Web presentation adapter | Channel | **Yes** (for J-CUS-001) |
| Customer identity / guest session | Channel / IAM | **Yes** |
| Customer Web policy allow-list | Policy | **Yes** |
| Tenant URL resolution `/store/[businessCode]` | Channel | **Yes** |
| Customer-safe DTOs | Adapter | **Yes** |
| CAP-CUS-006 Create cart (session) | Capability / session | **NEEDS_DECISION** |
| Receipt delivery to customer | CAP / ENG-009 | **PARTIAL** — staff receipt exists |
| ENG-003k SME template binding | Edition | Soft — Staff Web works without full edition UX |
| Expenses / cashbook | BP-010 | No — Future |
| Bookings | ENG-018 | No — Future |

---

## 14. Dependencies

```text
PLATFORM FOUNDATION (BP-001–009 + ENG-003o staff)
        ↓
SME EDITION DEFINITION (this document)
        ↓
ENG-003o Customer Web foundation (IP-03, IP-02, IP-08)
        ↓
SL-CUS-001 Web Goods Purchase
        ↓
SME Launch 1 certification
        ↓
(later) Property / NGO editions
```

---

## 15. MVP vs Post-MVP candidates

| Horizon | Scope |
|---------|-------|
| **SME MVP** | Staff ops (existing) + Customer Web goods purchase (SL-CUS-001) + receipt/status |
| **SME Phase 2** | Quotation customer path, procurement depth for wholesale, order tracking UX, supplier token hardening |
| **SME Future** | Booking, WhatsApp, PWA, reorder, expenses/GL, full ENG-003k packaging |

Detail: [SME Digitization MVP Scope](./SME-Digitization-MVP-Scope.md)

---

## 16. Architecture affirmation

SME Digitization Edition follows:

```text
Industry (IND-SME / IND-COM)
→ Business Type (RETAIL / WHOLESALE / …)
→ Edition/Template (ED-SME-001 / TPL-RETAIL)
→ Actor (Staff / Customer)
→ Journey (J-STAFF-*, J-CUS-*)
→ Capability (catalogue CAP-*)
→ Slice (SL-*)
→ Channel (Staff Web / Customer Web)
→ Domain (BP-00x)
→ Engine (ENG-*)
→ Data
```

No SME-specific payment, inventory, or party master is authorized.

---

*No production code authorized by this document.*
