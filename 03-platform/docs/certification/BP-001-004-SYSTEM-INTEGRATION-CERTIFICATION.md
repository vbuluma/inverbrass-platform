# BP-001 → BP-004 — Cumulative End-to-End System Integration Certification

**Date:** 2026-08-12  
**Branch:** `develop`  
**Scope:** BP-001 Business Setup & Onboarding → BP-002 Party → BP-003 Product/Offering/Pricing → BP-004 CRM (Lead, Opportunity, Quotation)  
**Validator:** `03-platform/scripts/bp001-004-system-integration-certification.ts`  
**Certification status:** **B. CONDITIONALLY CERTIFIED**

---

## 1. Executive conclusion

BP-001 → BP-004 operate as **one coherent application foundation** on shared `businessId`, `partyId`, `productId`/`offeringId`, pricing, and CRM identity (`crmId` / `leadId` / `opportunityId` / quotation `id`).

A single synthetic Business A journey was proven at runtime:

**Business → Party (CUSTOMER) → Product/Offering → Pricing → CRM → Lead → Opportunity → Quotation**

Critical cross-BP proof: quotation line creation **omitted** `unitPrice`, forcing:

`QuotationService → PricingResolutionAdapter → PricingService (BP-003)`

Resolved **unitPrice = 2750.5** and **pricingItemId** equal to the BP-003 price item just created (qty 2 → lineTotal 5501). No parallel pricing mechanism was introduced.

Tenant isolation holds across party, product, CRM, opportunity, quotation, and pricing resolution.

**Conditional** only because browser UI interaction was not executed. Routes, navigation, server-action/service wiring, and view contracts were validated. Smoke/runtime validators for BP-001–004 passed at the service layer.

---

## 2. BP-001 → BP-004 Integration Architecture Map

```
BP-001  BusinessRegistrationService
          → business.id (businessId)
          → business_membership.id
          → BusinessSetupService (configuration, currency, activation)
                ↓
BP-002  PartyService / IndividualProfileService
          → party.id (partyId)  [authoritative party identity]
          → party_role CUSTOMER | SUPPLIER
          → party_timeline + audit_history
                ↓
BP-003  ProductService
          → product.id  (= offeringId in pricing/CRM contracts)
          → product.ownerPartyId → party.id
          → product.businessId → business.id
          PricingService
          → pricing_catalogue.id
          → pricing_item.id (offeringId → product.id)
                ↓
BP-004  CrmService
          → crm_record.id exposed as crmId  [NOT interchangeable with partyId]
          → crm_record.party_id → party.id
        LeadService
          → crm_lead.id exposed as leadId
          → lead.party_id → party.id
          → convertLead → convertedCrmId (= crmId); OpportunityService.createFromLeadConversion
        OpportunityService
          → crm_opportunity.id exposed as opportunityId
          → opportunity.crm_record_id → crmId
        QuotationService
          → quotation.id
          → quotation.party_id / crm_record_id / opportunity_id
          → quotation_line.offering_id → product.id
          → quotation_line.pricing_item_id ← PricingResolutionAdapter ← BP-003
```

### Authoritative IDs at each boundary

| Boundary | Authoritative ID | Notes |
|---|---|---|
| Tenant | `businessId` | On every transactional row |
| Party | `partyId` (`party.id`) | Shared by BP-002/003/004 |
| Product / Offering | `product.id` | Same UUID; CRM/pricing call it `offeringId` |
| Pricing | `pricingItemId`, `pricingCatalogueId` | Never stored on product master |
| CRM Customer | `crmId` | View contract; DB `crm_record.id` |
| Lead | `leadId` | Not the same as `crmId` or `partyId` |
| Opportunity | `opportunityId` | References `crmRecordId` |
| Quotation | `quotation.id` | References party / crm / opportunity / offering / pricingItem |

**IDs are not interchangeable.** Validators must use view-contract fields (`crmId`, `leadId`, `opportunityId`), not guessed `id` aliases.

---

## 3. Synthetic business identity graph (runtime evidence)

From certification run (Business A currency = **KES**):

| Entity | ID | businessId | Parent/reference |
|---|---|---|---|
| Business | `da744f52-15d8-44ff-ba79-ec936e135011` | same | — |
| Membership | `d44640fd-858a-4be9-81a1-37f48577306c` | same | businessId |
| Party | `dd1f0dbb-a580-4aa7-b8c1-b604d4066a85` | same | businessId |
| Customer Role | `CUSTOMER` | same | partyId |
| Product/Offering | `1a22071d-e652-4f47-bc4c-39821b1d31da` | same | ownerPartyId = Party |
| Pricing Catalogue | `53a3dde7-5a9a-4284-8421-5574a6882492` | same | currency=KES |
| Pricing Item | `b388f577-ea7d-44ab-9790-8943a1a06d55` | same | offeringId + catalogueId |
| CRM Record | `1e330db3-704c-41f3-899a-15701a4d055b` | same | partyId |
| Lead | `f84286ee-919d-4c9f-a934-0bdaeda803cd` | same | partyId |
| Opportunity | `9898596f-5d1d-498f-ab15-b313323cdf5f` | same | crmId + leadId |
| Quotation | `5e4c6d9d-72d2-460d-91fd-db5bdba189bb` | same | partyId + crmId + opportunityId |
| Business B (isolation) | `650f19e0-65c6-4b9b-927e-405f8b36d640` | B | isolation fixture |

All Business A objects share **one** `businessId`. Cross-module FKs match the table above.

---

## 4. End-to-end journey results

| Journey | Result | Evidence |
|---|---|---|
| **J1** Business → Party/Customer | **PASS** | ACTIVE business, configuration, party create, CUSTOMER role, `PARTY_CREATED` + `ROLE_ASSIGNED`, CREATE audit |
| **J2** Customer → Product → Pricing | **PASS** | `ownerPartyId` = Party A; price item on offering; adapter resolved 2750.5 KES to same `pricingItemId` |
| **J3** Party → CRM | **PASS** | `crmId` ↔ `partyId`; PROSPECT; `CRM_RECORD_CREATED`; C360 panel returned |
| **J4** Lead → Opportunity | **PASS** | NEW→CONTACTED→QUALIFIED→CONVERTED; **no duplicate CRM**; CLOSED_WON + CLOSED_LOST; timeline events |
| **J5** Pricing → Quotation | **PASS** | Line without unitPrice resolved via BP-003 adapter; lineTotal 5501; full reference chain |
| **J6** Application / C360 | **PASS*** | Nav + routes + C360 tabs + service path proven; *browser not executed* (**BLOCKED**) |
| **Isolation** A vs B | **PASS** | Party/Product/CRM/Opp/Quote/Pricing denied from Business B |

Cumulative validator: **87/89 PASS · FAIL: 0 · BLOCKED: 2** (browser wiring only).

---

## 5. Cross-module adapter matrix

| Adapter | Producer | Consumer | Contract | Runtime | Result |
|---|---|---|---|---|---|
| Business → configuration | BP-001 BusinessSetupService | All modules via `businessId` | settings metadata | Yes | **PASS** |
| Party → Product owner | BP-002 party | BP-003 product | `ownerPartyId` | Yes | **PASS** |
| BP-003 Pricing → Quotation | PricingService | QuotationService | PricingResolutionAdapter | Yes (omitted unitPrice) | **PASS** |
| Party → CRM | BP-002 party | CrmService | `partyId` → `crmId` | Yes | **PASS** |
| Lead → Opportunity | LeadService | OpportunityService | convertLead / createFromLeadConversion | Yes | **PASS** |
| Lead attribution | Campaign | LeadService | LeadAttributionAdapter | Wired + instantiable | **PASS** (constructor/runtime presence; campaign path covered in BP-004 validator) |
| Opportunity handoff | Quotation accept | OpportunityService | OpportunityHandoffAdapter | Wired | **PASS** (adapter present; accept path in BP-004 validator) |

---

## 6. Application-flow / wiring matrix

| Route | Nav | Chrome prefix | Page | Result |
|---|---|---|---|---|
| `/dashboard` | Yes | Yes | Yes | PASS |
| `/parties` | Yes | Yes | Yes | PASS |
| `/products` | Yes | Yes | Yes | PASS |
| `/customers` | Yes | Yes | Yes | PASS |
| `/accounts` | Yes | Yes | Yes | PASS |
| `/leads` | Yes | Yes | Yes | PASS |
| `/opportunities` | Yes | Yes | Yes | PASS |
| `/quotations` | Yes | Yes | Yes | PASS |

C360 workspace tabs (authoritative): `customer-360`, `opportunities`, `quotations`, `timeline` — all available. Leads are a **top-level** `/leads` route, not a C360 tab.

**Browser interaction:** not executed — classified as intentional certification limitation, not an application defect.

---

## 7. Audit / timeline continuity (observed events)

Actual event types recorded during the synthetic journey:

| Event | Store | Module |
|---|---|---|
| `PARTY_CREATED` | party_timeline | BP-002 |
| `ROLE_ASSIGNED` | party_timeline | BP-002 |
| `PRODUCT_CREATED` / `PRODUCT_ACTIVATED` | product_timeline | BP-003 |
| `PRICE_CREATED` / `PRICE_ACTIVATED` | product_timeline | BP-003 |
| `CRM_RECORD_CREATED` | party_timeline | BP-004 |
| `LEAD_CREATED` / `LEAD_QUALIFIED` / `LEAD_CONVERTED` | party_timeline | BP-004 |
| `OPPORTUNITY_CREATED` / `STAGE_CHANGED` / `OPPORTUNITY_WON` / `OPPORTUNITY_LOST` | party_timeline | BP-004 |
| `QUOTATION_CREATED` | party_timeline | BP-004 |
| CREATE ops on party / product / crm_record / quotation | audit_history | BP-002/003/004 |

**Intentional difference:** Business creation uses ENG-001 authentication audit emitter (console), not `audit_history`. That is the established BP-001 pattern.

---

## 8. Tenant isolation results

Business B attempted to access Business A resources:

| Access | Result |
|---|---|
| Party A | DENIED / `PARTY_NOT_FOUND` |
| Product A | DENIED / `PRODUCT_NOT_FOUND` |
| CRM A | DENIED / CrmError |
| Opportunity A | DENIED / OpportunityError |
| Quotation A | DENIED / CrmError |
| Resolve Price A | DENIED (no leak) |

---

## 9. Migration / schema / seed status

| Check | Result |
|---|---|
| SQL ↔ journal | **PASS** (59/59) |
| Orphan SQL | **PASS** (none) |
| Missing journal SQL | **PASS** (none) |
| `npm run db:migrate` | **PASS** |
| Schema barrel (business, party, product, pricingItem, crmRecord, crmLead, crmOpportunity, quotation, salesOrder) | **PASS** |
| `npm run db:seed` | Executed as quality gate (idempotent catalogues) |

---

## 10. Quality gates

| Gate | Result |
|---|---|
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** (0 errors; pre-existing warnings only) |
| `npm run db:migrate` | **PASS** |
| `npm run db:seed` | **PASS** |
| BP-001→003 runtime validator | **PASS** (0 FAIL; 9 intentional BLOCKED boundaries) |
| BP-004 runtime validator | **PASS** (74/74) |
| BP-002 IP-001 smoke | **PASS** (58/58) |
| BP-003 IP-001 smoke | **PASS** (61/61) |
| BP-004 IP-001 smoke | **PASS** (60/60) |
| BP-004 IP-010 quotation smoke | **PASS** (65/65) |
| BP-001→004 cumulative certification | **87/89 PASS, 0 FAIL, 2 BLOCKED** |

---

## 11. Defects found / fixed

### Genuine application defects

**None** discovered in this certification pass that block the BP-001→004 identity/continuity chain.

(Prior BP-001→003 pass already fixed offering-relationship type bootstrap and seed coverage for pricing methods / governance statuses.)

### Harness defects

| Issue | Classification | Fix |
|---|---|---|
| Validator asserted C360 tabs `overview` / `leads` | Harness used guessed names | Updated to authoritative `customer-360`, `timeline`; leads confirmed as `/leads` route |

### Environment issues

None blocking certification in this run.

---

## 12. Intentional boundaries (not defects)

| Capability | Owner / status |
|---|---|
| Payment execution / allocation | Schema stubs only; not BP-001–004 service scope |
| Receipt issuance | BP-001 configuration metadata only |
| Payment reconciliation | Deferred |
| Product tax / discount engine | `tax_type` table; no BP-003 tax calculator; quotation tax totals use quotation calculation helpers |
| Offline queue / sync / conflict | Not implemented |
| Browser E2E automation | Not required for this certification |
| BP-005+ | Out of scope — **do not start** |

---

## 13. Remaining integration gaps

| Gap | Severity | Notes |
|---|---|---|
| Browser UI click-through of the full journey | Certification limitation | Wiring proven; interactive UI not executed |
| Business-created → `audit_history` | Architectural pattern | Uses ENG-001 emitter by design |

No missing cross-BP adapters were found for the certified chain Party ↔ Product ↔ Pricing ↔ CRM ↔ Lead ↔ Opportunity ↔ Quotation.

---

## 14. Cumulative Integration Trace Matrix

| Journey | BP Boundary | Producer | Consumer | Shared IDs | Adapter | Runtime | UI/Wiring | Audit/Timeline | Result |
|---|---|---|---|---|---|---|---|---|---|
| Business → Party | 001→002 | BusinessSetup / Party | Party services | businessId, partyId | shared tenant context | Yes | Yes | Yes | **PASS** |
| Party → Product | 002→003 | Party | ProductService | partyId → ownerPartyId | FK | Yes | Yes | Yes | **PASS** |
| Product → Pricing | 003 | Product | PricingService | offeringId = product.id | internal | Yes | Yes | Yes | **PASS** |
| Pricing → Quotation | 003→004 | PricingService | QuotationService | pricingItemId, offeringId | PricingResolutionAdapter | Yes | Yes | Yes | **PASS** |
| Party → CRM | 002→004 | Party | CrmService | partyId → crmId | service FK | Yes | Yes | Yes | **PASS** |
| Lead → Opportunity | 004 | LeadService | OpportunityService | leadId, crmId, opportunityId | convertLead | Yes | Yes | Yes | **PASS** |
| Customer → C360 | 002→004 | Party timeline + CRM | C360 panel | crmId, partyId | CrmService.getCustomer360Panel | Yes | Wiring yes / browser no | Yes | **PASS*** |
| Tenant isolation | 001→004 | All | All | businessId | query scoping | Yes | N/A | N/A | **PASS** |

\*C360 service + tabs proven; browser not executed.

---

## 15. Final certification status

### B. CONDITIONALLY CERTIFIED

**Proven**

- One shared `businessId` across Party, Product, Pricing, CRM, Lead, Opportunity, Quotation  
- Party → Product owner FK  
- BP-003 price consumed by BP-004 quotation via PricingResolutionAdapter (no parallel pricing)  
- CRM view contract uses `crmId`; lead conversion reuses existing CRM (no silent duplicate)  
- Opportunity CLOSED_WON and CLOSED_LOST  
- Tenant isolation across modules  
- Migrations, schema barrel, typecheck, lint  

**Not claimed as full CERTIFIED (A)** only because interactive browser validation was not executed.

---

## 16. How to re-run

```bash
cd 03-platform
npm run typecheck
npm run lint
npm run db:migrate
npm run db:seed
npx tsx scripts/bp001-004-system-integration-certification.ts
```

---

## 17. Stop condition

This certification covers **BP-001 → BP-004 only**.

**Do not start BP-005** or later Build Packs until explicit approval.
