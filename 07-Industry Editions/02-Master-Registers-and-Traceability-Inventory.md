# InverBrass Master Registers & Traceability Inventory

**Document ID:** IB-ARCH-CHN-002  
**Version:** 1.0  
**Status:** INVENTORY — mapped from existing implementation (BP-001–BP-009 + ENG-003o)  
**Date:** 2026-09-02  
**Parent:** [00 – InverBrass Master Capability, Industry, Journey & Slice Model](./00-InverBrass%20Master%20Capability,%20Industry,%20Journey%20&%20Slice%20Model.md)  
**Evidence base:** `03-platform/` modules, seeds, ENG-003o registry, certification docs, Platform Module Catalog VS-001–VS-012

---

## Purpose

This document maps **what already exists** in InverBrass into the four master registers defined by the governing model. It is an **implementation inventory**, not a greenfield design.

Use it to distinguish:

| State | Meaning |
|-------|---------|
| **EXISTS** | Domain + staff UI + services certified or production-ready |
| **PARTIAL** | Domain exists; channel/edition/customer path incomplete |
| **REGISTERED** | Listed in ENG-003o registry only; not fully channel-governed |
| **DESIGNED** | Documented journey/slice; no implementation |
| **VISION** | Industry/edition in blueprint; no domain module |

### Status legend (Industry maturity)

`VISION` → `INDUSTRY DEFINED` → `TYPE SEEDED` → `TEMPLATE DEFINED` → `EDITION DEFINED` → `PARTIALLY IMPLEMENTED` → `IMPLEMENTED` → `CERTIFIED`

### Build Pack implementation status (2026-09-02)

| Build Pack | Domain status | Certification evidence |
|------------|---------------|------------------------|
| **BP-001** Business Setup | **IMPLEMENTED** | Integration cert; onboarding wizard live |
| **BP-002** Party | **IMPLEMENTED** | System integration cert J1 |
| **BP-003** Product/Offering | **IMPLEMENTED** | IP-001–IP-013; smoke validators |
| **BP-004** CRM | **IMPLEMENTED** | 13-IP baseline; integration cert J3–J5 |
| **BP-005** Commercial | **IMPLEMENTED** | IP smokes documented PASS |
| **BP-006** Sales | **CERTIFIED** | `BP-006-SALES-CERTIFICATION.md` |
| **BP-007** Payments | **IMPLEMENTED** | IP-01–IP-08; smoke validators |
| **BP-008** Inventory | **IMPLEMENTED** | IP-01–IP-09; smoke validators |
| **BP-009** Procurement | **CERTIFIED** | 359/359 final integration cert |
| **ENG-003o** Channel Engine | **PARTIAL** | Staff Web gateway **IMPLEMENTED**; Customer Web foundation **CERTIFIED** (SL-ENG-003o-002); SL-CUS-001 commerce **CERTIFIED** |

---

# Register 1 — Industry & Edition Register

Maps seeded industries, business types, vertical solutions (VS), templates, and maturity.

## 1.1 Industry universe

| Industry ID | Industry name | Seed code | Business types seeded | Edition (VS) | Template | Maturity | Shared BP foundation used |
|-------------|---------------|-----------|----------------------|--------------|----------|----------|---------------------------|
| **IND-SME** | SME / General Business | — (primary audience) | All types via onboarding | **ED-SME-001 Launch 1** | Generic SME | **PARTIALLY IMPLEMENTED** | BP-001–009 |
| **IND-COM** | Commerce & Trade | `COMMERCE` | Retail, Wholesale | VS-001 + **ED-SME-001** | Retail Shop | **TYPE SEEDED** (Launch 1 primary) | BP-001–009 |
| **IND-HOS** | Hospitality | `HOSPITALITY` | Restaurant, Hotel | VS-006 Hospitality | Restaurant, Hotel | **TYPE SEEDED** | BP-001–009 (bookings out of scope) |
| **IND-HLT** | Healthcare | `HEALTHCARE` | Pharmacy, Clinic, Hospital | VS-004 Healthcare | Clinic, Pharmacy | **TYPE SEEDED** | BP-001–007, CRM, no clinical domain |
| **IND-EDU** | Education | `EDUCATION` | School, College | VS-003 Education | School | **TYPE SEEDED** | BP-001–007; **no School Management domain** |
| **IND-PRP** | Property | `PROPERTY` | Property Manager, Estate Agent | VS-002 — **Launch 2** | Property Management | **TYPE SEEDED** / **EDITION DEFINED** | BP-001–008; **no Property Management domain** |
| **IND-AGR** | Agriculture | `AGRICULTURE` | — | VS-005 Agriculture | — | **INDUSTRY DEFINED** | BP-001–008 partial |
| **IND-TRN** | Transport & Logistics | `TRANSPORT` | — | — | — | **INDUSTRY DEFINED** | BP-001–008 partial |
| **IND-MFG** | Manufacturing | `MANUFACTURING` | — | VS-011 Manufacturing | — | **INDUSTRY DEFINED** | BP-001–009 partial |
| **IND-PRO** | Professional Services | `PROFESSIONAL` | — | VS-012 Professional Services | — | **INDUSTRY DEFINED** | BP-001–007, CRM |
| **IND-FIN** | Financial Services | `FINANCIAL` | — | VS-009 Banking | — | **VISION** | BP-001–007; no lending domain |
| **IND-NPO** | Non-Profit / NGO | `NON_PROFIT` | — (party type `NGO`) | VS-010 — **Launch 3** | NGO | **INDUSTRY DEFINED** / **EDITION DEFINED** | BP-001–004, groups; **no Programme domain** |
| **IND-GOV** | Government | `GOVERNMENT` | — | — | — | **INDUSTRY DEFINED** | BP-001–002 only |
| **IND-CHA** | Chama / Community Finance | — (group type `CHAMA`) | Chama, SACCO, Savings Group | — | Chama | **TYPE SEEDED** (groups) | BP-002 groups; **no Chama Management domain** |
| **IND-INS** | Insurance | — | — | VS-008 Insurance | — | **VISION** | BP-001–007 partial |

**Seed sources:** `03-platform/src/db/seeds/industries.ts`, `business-types.ts`, `group-types.ts`, `crm-types.ts`

## 1.2 Industry Edition register (catalog VS-001–VS-012)

| Edition ID | Edition name | Catalog ref | Build packs consumed | Edition-specific domain | Maturity |
|------------|--------------|-------------|---------------------|-------------------------|----------|
| **ED-SME-001** | **SME Digitization Edition (Launch 1)** | Cross-cutting + VS-001 | BP-001–009 | None for MVP (shared only) | **PARTIALLY IMPLEMENTED** — Staff Web live; Customer Web foundation **CERTIFIED**; SL-CUS-001 commerce **CERTIFIED** — see [`SME Digitization/`](./SME%20Digitization/) |
| **ED-VS-001** | InverBrass Retail & Wholesale | VS-001 | BP-001–012 (planned) | POS, promotions (planned) | **EDITION DEFINED** — consumed by ED-SME-001 |
| **ED-VS-002** | InverBrass Property (**Launch 2**) | VS-002 | BP-001,002,003,006,007,008,011,012 | Properties, units, leases | **EDITION DEFINED** — no property module |
| **ED-VS-003** | InverBrass Education | VS-003 | BP-001–007,011,012 | Students, classes, fees | **EDITION DEFINED** — no school module |
| **ED-VS-004** | InverBrass Healthcare | VS-004 | BP-001–007,011,012 | Patients, lab, pharmacy ops | **EDITION DEFINED** — no clinical module |
| **ED-VS-005** | InverBrass Agriculture | VS-005 | BP-001–008,011,012 | Crops, livestock | **VISION** |
| **ED-VS-006** | InverBrass Hospitality | VS-006 | BP-001–008,012 | Rooms, reservations | **EDITION DEFINED** — bookings out of scope |
| **ED-VS-007** | InverBrass Transport | VS-007 | BP-001–008,011,012 | Fleet, trips | **VISION** |
| **ED-VS-008** | InverBrass Insurance | VS-008 | BP-001–007,012 | Policies, claims | **VISION** |
| **ED-VS-009** | InverBrass Banking | VS-009 | BP-001–007,010,012 | Loans, deposits | **VISION** |
| **ED-VS-010** | InverBrass NGO & Programmes (**Launch 3**) | VS-010 | BP-001–004,006,011,012 | Programmes, beneficiaries | **EDITION DEFINED** — no programme module |
| **ED-VS-011** | InverBrass Manufacturing | VS-011 | BP-001–009,010,012 | BOM, production orders | **VISION** |
| **ED-VS-012** | InverBrass Professional Services | VS-012 | BP-001–004,006,007,012 | Engagements, billable hours | **EDITION DEFINED** |

## 1.3 Template register (configuration targets)

| Template ID | Template name | Industry | Seeded today | Enabled capabilities (shared) | Industry-specific capabilities |
|-------------|---------------|----------|--------------|------------------------------|-------------------------------|
| **TPL-RETAIL** | Retail Shop | IND-COM | Business type `RETAIL` | Party, Product, Sales, Inventory, Payments, CRM | — |
| **TPL-WHOLESALE** | Wholesale | IND-COM | Business type `WHOLESALE` | + Procurement | — |
| **TPL-RESTAURANT** | Restaurant | IND-HOS | `RESTAURANT` | Product, Sales, Payments | Kitchen/booking (future) |
| **TPL-HOTEL** | Hotel | IND-HOS | `HOTEL` | Product, Sales, Payments, Inventory | Reservations (future ENG-018) |
| **TPL-SCHOOL** | School | IND-EDU | `SCHOOL` | Party, CRM, Payments, Sales | Students, fees, attendance (**VISION**) |
| **TPL-CHAMA** | Chama | IND-CHA | Group type `CHAMA` | Party groups, Payments | Contributions, loans (**VISION**) |
| **TPL-NGO** | NGO | IND-NPO | Party type `NGO`, group `NGO_GROUP` | Party, CRM, Documents | Programmes (**VISION**) |
| **TPL-PROPERTY** | Property Management | IND-PRP | `PROPERTY_MANAGER` | Party, Sales, Payments, Workflow | Units, leases (**VISION**) |
| **TPL-CLINIC** | Clinic | IND-HLT | `CLINIC` | Party, CRM, Product, Payments | Clinical records (**VISION**) |
| **TPL-GENERIC-SME** | Generic SME | IND-SME | Default onboarding | BP-001–009 full horizontal | — |

## 1.4 Industry × shared capability matrix (implementation truth)

Legend: **✓** = BP implemented · **C** = configurable via BP-001/003 · **P** = planned · **—** = not applicable

| Shared capability | BP | SME | Retail | Hospitality | Healthcare | Education | Property | NGO | Chama |
|-------------------|-----|-----|--------|-------------|------------|-------------|----------|-----|-------|
| Business setup | BP-001 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Party / Customer | BP-002 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (groups) |
| Offerings | BP-003 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | C |
| CRM | BP-004 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | C |
| Commercial / pricing | BP-005 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | C |
| Sales / orders | BP-006 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | C |
| Payments | BP-007 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | C |
| Inventory | BP-008 | ✓ | ✓ | C | C | — | C | — | — |
| Procurement | BP-009 | ✓ | C | ✓ | C | C | C | C | — |
| Students / classes | — | — | — | — | — | P | — | — | — |
| Programmes | — | — | — | — | — | — | — | P | — |
| Contributions / loans | — | — | — | — | — | — | — | — | P |

---

# Register 2 — Master Capability Catalogue

Maps business capabilities to Build Packs, runtime registry IDs (ENG-003o), actors, and implementation status.

**ID convention:** `CAP-{PLT|BIZ|STAFF|CUS|INT|IND}-nnn` · Runtime ID in `capability-registry.ts` where registered

## 2.1 Platform capabilities (BP-001 + core auth)

| Cap ID | Capability | Runtime ID | BP / Engine | Primary actors | Staff Web | Customer Web | Status |
|--------|------------|------------|-------------|----------------|-----------|--------------|--------|
| CAP-PLT-001 | Register business | — | BP-001 | Business Owner | ✓ onboarding | — | **EXISTS** |
| CAP-PLT-002 | Authenticate user | — | ENG-001 | All staff | ✓ | — | **EXISTS** |
| CAP-PLT-003 | Select business context | — | BP-001 / ENG-002 | Staff | ✓ | — | **EXISTS** |
| CAP-PLT-004 | Configure business settings | — | BP-001 / ENG-003a | Business Admin | ✓ `/settings` | — | **EXISTS** |
| CAP-PLT-005 | Manage staff membership | — | BP-001 / ENG-002 | Business Admin | ✓ | — | **EXISTS** |

## 2.2 Party & relationship (BP-002)

| Cap ID | Capability | Runtime ID | Primary actors | Channel today | Status |
|--------|------------|------------|----------------|---------------|--------|
| CAP-BIZ-001 | Manage parties | `PARTY_WORKSPACE` | Staff | Staff Web | **EXISTS** |
| CAP-BIZ-002 | Manage party contacts | — (workspace) | Staff | Staff Web | **EXISTS** |
| CAP-BIZ-003 | Manage party addresses | — | Staff | Staff Web | **EXISTS** |
| CAP-BIZ-004 | Manage party roles | — | Staff | Staff Web | **EXISTS** |
| CAP-BIZ-005 | Manage party relationships | — | Staff | Staff Web | **EXISTS** |
| CAP-BIZ-006 | Manage party groups | — | Staff | Staff Web `/groups` | **EXISTS** (incl. Chama group type) |
| CAP-BIZ-007 | Manage party documents | — | Staff | Staff Web | **EXISTS** |
| CAP-BIZ-008 | Party audit & timeline | — | Staff | Staff Web | **EXISTS** |

## 2.3 Product & offering (BP-003)

| Cap ID | Capability | Runtime ID | Primary actors | Status |
|--------|------------|------------|----------------|--------|
| CAP-BIZ-010 | Manage product catalogue | `PRODUCT_WORKSPACE` | Staff | **EXISTS** |
| CAP-BIZ-011 | Manage offerings | — | Staff | **EXISTS** |
| CAP-BIZ-012 | Manage pricing (offering level) | — | Staff | **EXISTS** (BP-003 IP-011) |
| CAP-BIZ-013 | Manage bundles / variants | — | Staff | **EXISTS** |
| CAP-BIZ-014 | Offering governance | — | Staff | **EXISTS** (ENG-003l foundation) |
| CAP-CUS-001 | View offering (browse) | `OFFERING_VIEW` | Customer | **REGISTERED** — staff-only flag today; customer path **DESIGNED** |
| CAP-CUS-002 | Query price | `PRICE_QUERY` | Customer, Staff | **PARTIAL** — domain exists; customer policy **DESIGNED** |

## 2.4 CRM (BP-004)

| Cap ID | Capability | Runtime ID | Primary actors | Status |
|--------|------------|------------|----------------|--------|
| CAP-BIZ-020 | CRM workspace | `CRM_WORKSPACE` | Staff | **EXISTS** |
| CAP-BIZ-021 | Manage leads | — | Staff | **EXISTS** |
| CAP-BIZ-022 | Manage opportunities | — | Staff | **EXISTS** |
| CAP-BIZ-023 | Manage accounts | — | Staff | **EXISTS** |
| CAP-BIZ-024 | Manage activities / visits / comms | — | Staff | **EXISTS** |
| CAP-BIZ-025 | Create quotation | `CREATE_QUOTATION` | Staff, Customer (channel expose) | **EXISTS** — Customer Web path SL-CUS-003 |
| CAP-BIZ-026 | Manage campaigns / cases | — | Staff | **EXISTS** |
| CAP-CUS-008 | Request quotation | `CREATE_QUOTATION` | Customer | **IMPLEMENTED** (J-CUS-003 / SL-CUS-003) — channel expose |

## 2.5 Commercial (BP-005)

| Cap ID | Capability | Runtime ID | Primary actors | Status |
|--------|------------|------------|----------------|--------|
| CAP-BIZ-030 | Commercial resolution | `COMMERCIAL_WORKSPACE` | Staff | **EXISTS** |
| CAP-BIZ-031 | Commercial governance | `COMMERCIAL_GOVERNANCE_WORKSPACE` | Staff | **EXISTS** |
| CAP-BIZ-032 | Tax compliance workspace | `TAX_COMPLIANCE_WORKSPACE` | Staff | **EXISTS** |
| CAP-CUS-002 | Query price (resolved) | `PRICE_QUERY` | Customer | **PARTIAL** |

## 2.6 Sales (BP-006)

| Cap ID | Capability | Runtime ID | Primary actors | Status |
|--------|------------|------------|----------------|--------|
| CAP-BIZ-040 | Sales workspace | `SALES_WORKSPACE` | Staff | **EXISTS** / **CERTIFIED** |
| CAP-BIZ-041 | Create direct sale | — | Staff | **EXISTS** |
| CAP-BIZ-042 | Convert quotation to order | — | Staff | **EXISTS** |
| CAP-BIZ-043 | Manage order lifecycle | — | Staff | **EXISTS** |
| CAP-BIZ-044 | Fulfilment / delivery | — | Staff | **EXISTS** |
| CAP-CUS-007 | Create sale / order | `CREATE_SALE` | Customer | **PARTIAL** — domain **EXISTS**; Customer Web **DESIGNED** |
| CAP-CUS-011 | View order | `VIEW_ORDER` | Customer, Staff | **PARTIAL** |

## 2.7 Payments (BP-007)

| Cap ID | Capability | Runtime ID | Primary actors | Status |
|--------|------------|------------|----------------|--------|
| CAP-BIZ-050 | Payments workspace | `PAYMENT_WORKSPACE` | Staff | **EXISTS** |
| CAP-BIZ-051 | Manage obligations | — | Staff | **EXISTS** |
| CAP-BIZ-052 | Initiate payment | — | Staff | **EXISTS** |
| CAP-BIZ-053 | Allocate / receipt / refund | — | Staff | **EXISTS** |
| CAP-CUS-010 | Initiate payment | `INITIATE_PAYMENT` | Customer | **PARTIAL** |
| CAP-CUS-016 | View payment status | `VIEW_PAYMENT_STATUS` | Customer | **PARTIAL** |

## 2.8 Inventory (BP-008)

| Cap ID | Capability | Runtime ID | Primary actors | Status |
|--------|------------|------------|----------------|--------|
| CAP-BIZ-060 | Inventory workspace | `INVENTORY_WORKSPACE` | Staff | **EXISTS** |
| CAP-BIZ-061 | Receive stock | — | Staff | **EXISTS** |
| CAP-BIZ-062 | Reserve / issue stock | — | Staff | **EXISTS** |
| CAP-BIZ-063 | Transfer / adjust / stocktake | — | Staff | **EXISTS** |
| CAP-CUS-005 | Check availability | `STOCK_AVAILABILITY_QUERY` | Customer | **PARTIAL** |

## 2.9 Procurement (BP-009)

| Cap ID | Capability | Runtime ID | Primary actors | Status |
|--------|------------|------------|----------------|--------|
| CAP-BIZ-070 | Procurement workspace | `PROCUREMENT_WORKSPACE` | Staff | **EXISTS** / **CERTIFIED** |
| CAP-BIZ-071 | Manage suppliers | `VIEW_SUPPLIER` | Staff | **EXISTS** |
| CAP-BIZ-072 | Create purchase request | `CREATE_PROCUREMENT_REQUEST` | Staff | **EXISTS** |
| CAP-BIZ-073 | Sourcing / RFX / award | — | Staff | **EXISTS** |
| CAP-BIZ-074 | Purchase orders / contracts | — | Staff | **EXISTS** |
| CAP-BIZ-075 | Receiving / supplier invoice | — | Staff | **EXISTS** |
| CAP-INT-001 | Supplier RFX response (token) | — | Supplier | **PARTIAL** — `/sourcing/respond/[token]` |
| CAP-INT-002 | Supplier PO response (token) | — | Supplier | **PARTIAL** — `/procurement/po/respond/[token]` |

## 2.10 Channel infrastructure (ENG-003o)

| Cap ID | Capability | Runtime ID | BP / Engine | Status |
|--------|------------|------------|-------------|--------|
| CAP-PLT-010 | Channel gateway orchestration | — | ENG-003o | **EXISTS** (staff path) |
| CAP-PLT-011 | Capability registry lookup | — | ENG-003o | **EXISTS** |
| CAP-PLT-012 | Channel policy evaluation | — | ENG-003o | **PARTIAL** — staff + Customer Web partition **CERTIFIED**; conversational not enabled |
| CAP-PLT-013 | Staff identity resolution | — | ENG-003o IP-03 | **EXISTS** |
| CAP-PLT-014 | Customer identity resolution | — | ENG-003o IP-03 | **DESIGNED** |
| CAP-PLT-015 | Cross-channel session / correlation | — | ENG-003o IP-04 | **PARTIAL** — foundation only |
| CAP-PLT-016 | Intent → capability mapping | — | ENG-003o IP-05 | **REGISTERED** — contract only |

## 2.11 Industry-specific capabilities (future — domain model only)

| Cap ID | Capability | Domain model ref | BP module | Status |
|--------|------------|------------------|-----------|--------|
| CAP-IND-001 | Manage students | School Management | — | **VISION** |
| CAP-IND-002 | Manage classes / attendance | School Management | — | **VISION** |
| CAP-IND-003 | Collect school fees | Fee structures | Reuses BP-007 | **DESIGNED** |
| CAP-IND-010 | Manage programmes | NGO domain | — | **VISION** |
| CAP-IND-011 | Manage beneficiaries | NGO domain | Reuses BP-002 Party | **VISION** |
| CAP-IND-020 | Member contributions | Chama Management | Reuses BP-007 | **VISION** |
| CAP-IND-021 | Chama loans | Chama Management | — | **VISION** |
| CAP-IND-030 | Manage properties / units | Property Management | — | **VISION** |
| CAP-IND-031 | Manage leases / rent | Property Management | Reuses BP-006/007 | **VISION** |

---

# Register 3 — Journey Catalogue

Journeys mapped to actors, capabilities, channels, and implementation status.

## 3.1 Platform & business journeys (staff / admin)

| Journey ID | Journey name | Actor | Capabilities used | Channel | BP(s) | Status |
|------------|--------------|-------|-------------------|---------|-------|--------|
| **J-PLT-001** | Register & activate business | Business Owner | CAP-PLT-001–005 | Platform Web | BP-001 | **CERTIFIED** (integration) |
| **J-BIZ-001** | Onboard customer (party) | Staff | CAP-BIZ-001–004 | Staff Web | BP-002 | **EXISTS** |
| **J-BIZ-002** | Configure offering | Staff | CAP-BIZ-010–014 | Staff Web | BP-003 | **EXISTS** |
| **J-BIZ-003** | Lead → opportunity → quotation | Staff | CAP-BIZ-021–025 | Staff Web | BP-004 | **CERTIFIED** (J4–J5) |
| **J-STAFF-001** | Process customer sale (direct) | Staff | CAP-BIZ-041, 052, 061 | Staff Web | BP-006,007,008 | **CERTIFIED** (BP-006) |
| **J-STAFF-002** | Quote-to-order conversion | Staff | CAP-BIZ-025, 042 | Staff Web | BP-004,006 | **EXISTS** |
| **J-STAFF-003** | Receive inventory | Staff | CAP-BIZ-061 | Staff Web | BP-008 | **EXISTS** |
| **J-STAFF-004** | Procure goods (PR → PO → receive) | Staff | CAP-BIZ-072–075 | Staff Web | BP-009 | **CERTIFIED** |
| **J-STAFF-005** | Collect customer payment | Staff | CAP-BIZ-052, 053 | Staff Web | BP-007 | **EXISTS** |
| **J-INT-001** | Supplier respond to RFX | Supplier | CAP-INT-001 | Token Web | BP-009 | **PARTIAL** |
| **J-INT-002** | Supplier accept PO | Supplier | CAP-INT-002 | Token Web | BP-009 | **PARTIAL** |

## 3.2 Customer journeys (cross-industry)

| Journey ID | Journey name | Actor | Industries | Capabilities | Channel target | Status |
|------------|--------------|-------|------------|--------------|----------------|--------|
| **J-CUS-001** | Purchase goods | Customer | SME, Retail, NGO*, Chama* | CAP-CUS-001–007, 010, 011, 016 | Customer Web, PWA, WhatsApp | **DESIGNED** — domain **PARTIAL** |
| **J-CUS-002** | Book service | Customer | SME, Hospitality, Healthcare, Education | CAP-CUS-001–010 + booking | Customer Web | **DESIGNED** — bookings **out of scope** |
| **J-CUS-003** | Request quotation | Customer | SME, Professional | CAP-CUS-001–004, CAP-CUS-008 | Customer Web | **IMPLEMENTED** (SL-CUS-003) |
| **J-CUS-004** | Track order | Customer | All commerce | CAP-CUS-011, 016 | Customer Web, WhatsApp | **CERTIFIED** (Customer Web SL-CUS-004; CRM Case deferred) |
| **J-CUS-005** | Pay existing obligation | Customer | All | CAP-CUS-010, 016 | Customer Web, WhatsApp | **IMPLEMENTED** (SL-CUS-005; live cert pending) |
| **J-CUS-006** | Reorder goods | Customer | Retail, SME | CAP-CUS-007, 010 | Customer Web | **DESIGNED** |
| **J-CUS-007** | Complete payment (checkout) | Customer | All commerce | CAP-CUS-007, 010, 016 | Customer Web | **DESIGNED** |

## 3.3 Industry-specific journeys (future)

| Journey ID | Journey name | Actor | Industry | Reuses | Industry-specific | Status |
|------------|--------------|-------|----------|--------|-------------------|--------|
| **J-IND-001** | Enrol student | Staff / Parent | Education | Party, CRM, Payments | Students, classes | **VISION** |
| **J-IND-002** | Collect school fees | Parent | Education | CAP-CUS-010, Party | Fee structures | **DESIGNED** |
| **J-IND-010** | Create programme | Staff | NGO | Party, CRM, Documents | Programmes | **VISION** |
| **J-IND-020** | Member contribution | Member | Chama | Party, Payments | Contributions | **VISION** |
| **J-IND-030** | Lease unit / collect rent | Staff | Property | Sales, Payments, Workflow | Property entities | **VISION** |

## 3.4 Journey step detail — J-CUS-001 Purchase Goods (first channel slice)

| Step | Capability | Runtime ID | Domain | Implemented |
|------|------------|------------|--------|-------------|
| Discover business | CAP-CUS-001 | — | BP-001 tenant | Tenant record **EXISTS**; storefront **DESIGNED** |
| Browse offerings | CAP-CUS-001 | `OFFERING_VIEW` | BP-003 | Domain **EXISTS**; customer adapter **DESIGNED** |
| View offering | CAP-CUS-003 | `OFFERING_VIEW` | BP-003 | Same |
| Query price | CAP-CUS-004 | `PRICE_QUERY` | BP-005 | Domain **EXISTS** |
| Check availability | CAP-CUS-005 | `STOCK_AVAILABILITY_QUERY` | BP-008 | Domain **EXISTS** |
| Create cart | CAP-CUS-006 | — | ENG-003o session | **DESIGNED** |
| Create sale | CAP-CUS-007 | `CREATE_SALE` | BP-006 | Domain **EXISTS** |
| Initiate payment | CAP-CUS-010 | `INITIATE_PAYMENT` | BP-007 | Domain **EXISTS** |
| View order / payment status | CAP-CUS-011, 016 | `VIEW_ORDER`, `VIEW_PAYMENT_STATUS` | BP-006,007 | Domain **EXISTS** |

---

# Register 4 — Channel / Capability / Journey / Slice Traceability

## 4.1 Channel register

| Channel ID | Channel name | ENG-003o code | Actor(s) | Adapter | Policy | Auth model | Status |
|------------|--------------|---------------|----------|---------|--------|------------|--------|
| **CH-STAFF** | Staff Web | `WEB` / `STAFF` | Staff, Business Admin | `WebChannelAdapter` | ENG-003o WEB policy | ENG-002 RBAC + business membership | **IMPLEMENTED** |
| **CH-CUST** | Customer Web | `WEB` (customer profile) | Customer, Guest | `/store/[businessCode]` | Customer allow-list **IMPLEMENTED** | Guest session + optional customer account **IMPLEMENTED** (Party bind pending) | **CERTIFIED** (foundation SL-ENG-003o-002) |
| **CH-PLT** | Platform / onboarding Web | — | Business Owner | Next.js public routes | Platform auth | ENG-001 session | **EXISTS** |
| **CH-TOKEN-SUP** | Supplier token portal | `WEB` (implicit) | Supplier | Token pages | Token binding | Token (no login) | **PARTIAL** |
| **CH-PWA** | PWA | `APP` | Customer | — | APP policy stub | TBD | **VISION** |
| **CH-WA** | WhatsApp | `WHATSAPP` / `CONVERSATIONAL` | Customer | — | Empty policy | External identity **DESIGNED** | **VISION** |
| **CH-API** | Public API | `API` | Partner | — | Partial (4 caps) | API auth TBD | **VISION** |

## 4.2 Capability × channel matrix (implementation truth)

| Runtime capability | Staff Web | Customer Web | PWA | WhatsApp | API | Notes |
|--------------------|-----------|--------------|-----|----------|-----|-------|
| `PARTY_WORKSPACE` | ✓ | — | — | — | — | Staff only |
| `PRODUCT_WORKSPACE` | ✓ | — | — | — | — | Staff only |
| `CRM_WORKSPACE` | ✓ | — | — | — | — | Staff only |
| `OFFERING_VIEW` | ✓ (staff) | **P** | P | P | P | Registry: staff-only flag; customer **needs fix** |
| `PRICE_QUERY` | ✓ | **P** | P | P | — | Domain exists |
| `STOCK_AVAILABILITY_QUERY` | ✓ | **P** | P | P | — | Domain exists |
| `CREATE_QUOTATION` | ✓ | **P** | P | P | — | BP-004; Customer Web SL-CUS-003 |
| `VIEW_QUOTATION` | ✓ | **P** | P | P | — | BP-004 read expose |
| `CREATE_SALE` | ✓ | **P** | P | P | ✓ | Domain exists |
| `VIEW_ORDER` | ✓ | **P** | P | — | ✓ | Domain exists |
| `INITIATE_PAYMENT` | ✓ | **P** | P | — | ✓ | Domain exists |
| `VIEW_PAYMENT_STATUS` | ✓ | **P** | P | — | ✓ | Domain exists |
| `INVENTORY_WORKSPACE` | ✓ | — | — | — | — | Staff only |
| `PROCUREMENT_*` | ✓ | — | — | — | — | Staff only |
| Token supplier caps | — | — | — | — | — | Separate token routes |

Legend: ✓ = implemented today · **P** = domain partial / customer path designed · — = denied

## 4.3 Slice register

| Slice ID | Slice name | Journey | Actor | Channel | Capabilities | Build packs | Status | Certification |
|----------|------------|---------|-------|---------|--------------|-------------|--------|---------------|
| **SL-PLT-001** | Business onboarding & activation | J-PLT-001 | Business Owner | Platform Web | CAP-PLT-001–005 | BP-001 | **CERTIFIED** | Integration cert |
| **SL-STAFF-001** | Staff horizontal operations workspace | J-STAFF-001–005 | Staff | Staff Web | All `*_WORKSPACE` + domain actions | BP-002–009 | **IMPLEMENTED** | BP-006, BP-009 certified |
| **SL-ENG-003o-001** | Staff Web channel gateway (reference) | All staff | Staff | Staff Web | Gateway + registry | ENG-003o | **IMPLEMENTED** | Smoke script exists |
| **SL-ENG-003o-002** | Customer Web foundation | All J-CUS-* | Customer | Customer Web | CAP-PLT-012/014/015 | ENG-003o | **CERTIFIED** | Prerequisite for SL-CUS-001 (Launch 1) |
| **SL-INT-001** | Supplier RFX token response | J-INT-001 | Supplier | Token Web | CAP-INT-001 | BP-009 | **PARTIAL** | BP-009 cert includes portal |
| **SL-INT-002** | Supplier PO token acceptance | J-INT-002 | Supplier | Token Web | CAP-INT-002 | BP-009 | **PARTIAL** | Same |
| **SL-CUS-001** | Web goods purchase | J-CUS-001 | Customer | Customer Web | CAP-CUS-001–007,010,011,016 | BP-003,005,006,007,008 + ENG-003o | **CERTIFIED** | 73/0/4 cert; migration + live E2E + concurrency |
| **SL-CUS-002** | Web service booking | J-CUS-002 | Customer | Customer Web | + booking | BP-003,006,007 + ENG-018 | **DESIGNED** | Blocked: no scheduling engine |
| **SL-CUS-003** | Web quotation request | J-CUS-003 | Customer | Customer Web | CAP-CUS-008 → CREATE_QUOTATION, VIEW_QUOTATION | BP-003,004 | **CERTIFIED** | 54/0/0 live E2E + migration 0095 |
| **SL-EDU-001** | Parent pays school fees | J-IND-002 | Parent | Customer Web / WhatsApp | CAP-IND-003, CAP-CUS-010 | BP-007 + future fee domain | **DESIGNED** | Industry edition scope |
| **SL-CHA-001** | Member contribution | J-IND-020 | Member | Web / WhatsApp | CAP-IND-020, CAP-CUS-010 | BP-007 + future Chama | **VISION** | Industry edition scope |
| **SL-WA-001** | WhatsApp goods purchase | J-CUS-001 | Customer | WhatsApp | Same as SL-CUS-001 | ENG-003o IP-07 | **VISION** | After SL-CUS-001 |

## 4.4 Master traceability chain (filled example — SL-CUS-001)

```text
BUSINESS OBJECTIVE: SME customer can buy goods online
        ↓
INDUSTRY: IND-SME / IND-COM (Retail)
        ↓
BUSINESS TYPE: RETAIL
        ↓
EDITION: ED-VS-001 (uses shared platform)
        ↓
TEMPLATE: TPL-RETAIL
        ↓
ACTOR: CUSTOMER (guest-first)
        ↓
JOURNEY: J-CUS-001 Purchase Goods
        ↓
CAPABILITIES: OFFERING_VIEW, PRICE_QUERY, STOCK_AVAILABILITY_QUERY,
              CREATE_SALE, INITIATE_PAYMENT, VIEW_ORDER, VIEW_PAYMENT_STATUS
        ↓
SLICE: SL-CUS-001
        ↓
CHANNEL: CH-CUST (Customer Web)
        ↓
ADAPTER: Web Customer Presentation Adapter (ENG-003o IP-08) — NOT BUILT
        ↓
GATEWAY: ENG-003o — EXISTS (staff path)
        ↓
DOMAINS: BP-003, BP-005, BP-006, BP-007, BP-008 — ALL EXIST
        ↓
ENGINES: ENG-003o, ENG-005 (workflow if needed), ENG-006, ENG-013
        ↓
CERTIFICATION: PENDING
```

## 4.5 Build Pack × Slice × Channel matrix

| Build Pack | Staff Web slice | Customer Web slice | Token / external | Industry slice |
|------------|-----------------|--------------------|------------------|----------------|
| BP-001 | SL-PLT-001 | — | — | All editions |
| BP-002 | SL-STAFF-001 | SL-CUS-001 (party at checkout) | — | SL-EDU-001, SL-CHA-001 |
| BP-003 | SL-STAFF-001 | SL-CUS-001 | — | All commerce |
| BP-004 | SL-STAFF-001 | SL-CUS-003 | — | CRM editions |
| BP-005 | SL-STAFF-001 | SL-CUS-001 | — | All commerce |
| BP-006 | SL-STAFF-001 | SL-CUS-001 | — | All commerce |
| BP-007 | SL-STAFF-001 | SL-CUS-001, SL-EDU-001 | — | All |
| BP-008 | SL-STAFF-001 | SL-CUS-001 (read-only) | — | Retail, hospitality |
| BP-009 | SL-STAFF-001 | — | SL-INT-001/002 | Wholesale, manufacturing |

---

# Analysis — What exists vs gaps

## Already exists (production-ready shared platform)

The horizontal **SME operating platform** is real and substantial:

1. **BP-001–009** domain services, UI workspaces, migrations, and certification (BP-006, BP-009 certified; others implemented with smoke coverage)
2. **Staff Web** as unified operational hub: Dashboard, Parties, Offerings, CRM, Sales, Payments, Inventory, Procurement
3. **ENG-003o** staff reference path: gateway, registry, policy, web adapter, permission resolution, domain channel entry helpers
4. **Cross-domain contracts**: payment-ready order, fulfilment handoff, commercial resolution, procurement receiving
5. **Proto-external channels**: supplier token portals (BP-009)
6. **Industry seeds**: 12 industries, 11 business types, 16 group types (incl. Chama, NGO)
7. **Edition catalog**: VS-001–VS-012 defined in Platform Module Catalog

## Partially implemented

| Area | What exists | What is missing |
|------|-------------|-----------------|
| **Customer Web** | Domain services for browse/buy/pay; ENG-003o registry; foundation + SL-CUS-001 storefront | Party IAM harden (G-02); external receipt delivery out of scope |
| **ENG-003o** | Staff identity, gateway, registry; Customer Web foundation | Conversational adapters; commerce capability handlers |
| **Capability registry** | 24 runtime capabilities | CAP-CUS-* catalogue mapping; `OFFERING_VIEW` staff-only misconfiguration; workspace caps marked non-staff |
| **Channel policy** | Single WEB policy (staff-oriented) | Separate `CUSTOMER_WEB` deny-by-default allow-list |
| **Industry Editions** | Catalog + seeds | ENG-003k edition binding, terminology, menu filtering, templates |
| **Supplier channel** | Token pages work | Not generalized as ENG-003o supplier actor profile |

## Missing (required before SL-CUS-001 commerce)

Foundation (**SL-ENG-003o-002**) closed items 1–6 below as contracts/routes. Remaining for commerce certification:

1. ~~`WebCustomerChannelAdapter`~~ — **RESOLVED**
2. ~~`resolveCustomerWebIdentity()`~~ — **RESOLVED** (Party bind `PENDING_IAM`)
3. ~~Tenant resolution from `/store/[businessCode]`~~ — **RESOLVED**
4. ~~Customer Web permission grants (`CustomerWeb.*`)~~ — **RESOLVED**
5. Customer-safe **commerce** DTOs (offering/price/order/payment views) — foundation helpers exist
6. ~~Customer Web routes under `(public)/store/[businessCode]/`~~ — **RESOLVED** (foundation shell)
7. Idempotency on customer-initiated `CREATE_SALE` — **REMAINING** (channel key READY; BP-006 acceptance blocked)
8. Wire order/payment read paths to guest resource scope — **PARTIAL**
9. Storefront browse → checkout UX — **REMAINING** (SL-CUS-001)

## Genuinely future / Industry Edition scope

Do **not** block SL-CUS-001 on these:

| Item | Why future |
|------|------------|
| School Management domain (students, classes, attendance) | Industry-specific BP — not built |
| Chama Management domain (contributions, loans) | Industry-specific BP — only party groups exist |
| NGO Programme domain | VS-010 defined; no module |
| Property Management domain | VS-002 defined; no module |
| Healthcare clinical workflows | VS-004 defined; no module |
| Banking / lending | VS-009 vision |
| WhatsApp / conversational | ENG-003o IP-07; after SL-CUS-001 |
| PWA / native app | Presentation adapter only |
| Public REST API | ENG-003o non-scope until partner requirement |
| Bookings / appointments | ENG-018 Phase 2; explicitly out of BP-006 scope |
| BP-010 Finance / GL | Planned build pack |

## Recommended first channel slices (priority order)

| Priority | Slice | Rationale |
|----------|-------|-----------|
| **1** | **SL-ENG-003o-002** — Customer Web foundation | Prerequisite for all customer slices (Launch 1) |
| **2** | **SL-CUS-001** — Web goods purchase | Domains exist; proves Customer Web + ENG-003o; SME Launch 1 MVP |
| **3** | **SL-CUS-005** — Pay existing obligation (pay-later) | Reuses BP-007 `INITIATE_PAYMENT`; Phase 2 **IMPLEMENTED — live cert pending** |
| **4** | **SL-CUS-003** — Web quotation request | Reuses BP-004 quotation; B2B SME path |
| **5** | **SL-CUS-004** — Order / payment tracking | After SL-CUS-001 |
| **6** | **SL-EDU-001** | Blocked on fee/student domain or configurable fee offerings via BP-003/007 only |
| **7** | **SL-CHA-001** | Blocked on Chama Management domain |

**Implementation sequence for SL-CUS-001:**

```text
Step 1–2 + foundation cert: ✅ SL-ENG-003o-002 (2026-09-03)
Step 3: SL-CUS-001 vertical slice (browse → pay → confirm)
Step 4: Customer IAM Party bind + BP-006 CREATE_SALE idempotency
Step 5: ENG-003o IP-09 certification (customer commerce + staff regression)
```

---

# Document governance

| Register | Update trigger |
|----------|----------------|
| Industry & Edition | New seed, new VS edition, template activation |
| Capability Catalogue | New BP capability, new ENG-003o registry entry, customer policy change |
| Journey Catalogue | New actor outcome, industry journey, channel journey |
| Traceability | Slice state change, certification, channel addition |

**Related documents:**

- [00 – Master Model](./00-InverBrass%20Master%20Capability,%20Industry,%20Journey%20&%20Slice%20Model.md) — governing hierarchy
- [Industry Launch Portfolio](./Industry-Launch-Portfolio.md) — Launch 1 SME → Launch 2 Property → Launch 3 NGO
- [SME Digitization Edition Definition](./SME%20Digitization/SME-Digitization-Edition-Definition.md)
- [SME Digitization MVP Scope](./SME%20Digitization/SME-Digitization-MVP-Scope.md)
- [SME Digitization Journey Map](./SME%20Digitization/SME-Digitization-Journey-Map.md)
- [SME Digitization Slice Register](./SME%20Digitization/SME-Digitization-Slice-Register.md)
- [SME Edition Gap & Decision Register](./SME%20Digitization/SME-Edition-Gap-and-Decision-Register.md)
- [15 – ENG-003o Channel & Experience Engine](../01-enterprise-architecture/15-ENG-003o-Channel-Experience-Engine.md) — engine spec
- [02 – Platform Module Catalog](../01-enterprise-architecture/02-Platform-Module-Catalog.md) — BP and VS catalog

---

*Inventory mapped from repository state post BP-009 certification and ENG-003o staff Web reference implementation. Updated 2026-09-03 for Launch 1 SME Digitization Edition freeze. No production code modified.*
