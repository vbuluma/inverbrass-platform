# Industry Launch Portfolio

**Document ID:** IB-ED-PORT-001  
**Version:** 1.0  
**Status:** AUTHORITATIVE — Launch portfolio freeze  
**Date:** 2026-09-03  
**Parent:** [00 – Master Capability, Industry, Journey & Slice Model](./00-InverBrass%20Master%20Capability,%20Industry,%20Journey%20&%20Slice%20Model.md)  
**Registers:** [02 – Master Registers & Traceability Inventory](./02-Master-Registers-and-Traceability-Inventory.md)

---

## Purpose

This document freezes the **strategic launch order** for InverBrass Industry Editions. It separates platform foundation from edition launches and records maturity strictly from existing evidence.

---

## Strategic launch order

| Launch | Edition | Edition ID | Catalog ref | Maturity (evidence) | This pass |
|--------|---------|------------|-------------|---------------------|-----------|
| **Launch 1** | **SME Digitization Edition** | ED-SME-001 | Cross-cutting / VS-001 foundation | **PARTIALLY IMPLEMENTED** — BP-001–009 Staff Web exists | **Define & scope** |
| **Launch 2** | **Property Management Edition** | ED-VS-002 | VS-002 | **EDITION DEFINED** — no property domain module | Future only |
| **Launch 3** | **NGO Management Edition** | ED-VS-010 | VS-010 | **EDITION DEFINED** — no programme domain module | Future only |

Do **not** implement Property or NGO functionality as part of Launch 1.

---

## Layer separation (mandatory)

```text
PLATFORM FOUNDATION          ← BP-001–009 + ENG-001–016 + ENG-003o (shared)
        ↓
SME DIGITIZATION EDITION     ← Launch 1 — compose / configure / channel-expose
        ↓
PROPERTY MANAGEMENT EDITION  ← Launch 2 — reuse SME + Property-specific domain
        ↓
NGO MANAGEMENT EDITION       ← Launch 3 — reuse SME + Programme-specific domain
```

| Layer | Owns | Does not own |
|-------|------|--------------|
| **PLATFORM FOUNDATION** | Domains, engines, shared capabilities, Staff Web ops | Industry UX packaging |
| **SME EDITION** | Template, journeys, slices, Customer Web for SME commerce | New payment/inventory/party masters |
| **PROPERTY EDITION** | Property/unit/lease capabilities + journeys | Duplicate payments/customers |
| **NGO EDITION** | Programme/beneficiary capabilities + journeys | Duplicate payments/customers |

---

## Launch 1 — SME Digitization Edition (summary)

| Attribute | Value |
|-----------|-------|
| Target | African SMEs digitizing goods/services operations |
| Primary industries | Commerce (Retail, Wholesale), generic SME; Hospitality/Professional as configuration |
| Staff channel | Staff Web — **IMPLEMENTED** |
| Customer channel | Customer Web — **DESIGNED** (SL-CUS-001) |
| Shared BPs | BP-001–009 |
| Industry-specific BPs | **None required for MVP** |
| Detail docs | [`SME Digitization/`](./SME%20Digitization/) |

---

## Launch 2 — Property Management Edition (future)

### Current maturity (evidence only)

| Evidence | Status |
|----------|--------|
| Industry seed `PROPERTY` | **TYPE SEEDED** |
| Business types `PROPERTY_MANAGER`, `ESTATE_AGENT` | **TYPE SEEDED** |
| Catalog VS-002 | **EDITION DEFINED** |
| Property Management domain module | **MISSING** |
| Property UI / leases / units | **MISSING** |

### Reusable from SME / platform

| Capability | Source | Reuse mode |
|------------|--------|------------|
| Business setup | BP-001 | SHARED_PLATFORM |
| Party (tenant/landlord as Party) | BP-002 | SHARED_PLATFORM |
| Offerings (rental unit as offering — **NEEDS_DECISION**) | BP-003 | SME_CONFIGURATION_OF_SHARED_CAPABILITY or Property-specific |
| Sales / payment of rent | BP-006 / BP-007 | SHARED_PLATFORM |
| Workflow / documents | ENG-005 / ENG-015 | SHARED_PLATFORM |
| Customer Web pay invoice | ENG-003o + BP-007 | SHARED_PLATFORM (after SME) |

### Required Property-specific (future)

| Capability | Status |
|------------|--------|
| CAP-IND-030 Manage properties / units | **VISION** |
| CAP-IND-031 Manage leases / rent | **VISION** |
| J-IND-030 Lease unit / collect rent | **VISION** |
| Property template activation (ENG-003k) | **MISSING** |

### Blockers for Launch 2

1. No Property domain Build Pack / module  
2. ENG-003k edition binding not production-complete  
3. Customer Web not yet proven on SME (SL-CUS-001)  
4. Lease/rent entity model not specified as IP

### Likely future slices (not implemented)

| Slice | Journey | Status |
|-------|---------|--------|
| SL-PRP-001 Staff property & unit setup | Property admin | **PLANNED** |
| SL-PRP-002 Lease creation | Staff | **PLANNED** |
| SL-PRP-003 Tenant rent payment (Customer Web) | Tenant | **PLANNED** |

---

## Launch 3 — NGO Management Edition (future)

### Current maturity (evidence only)

| Evidence | Status |
|----------|--------|
| Industry seed `NON_PROFIT` | **INDUSTRY DEFINED** |
| Party type `NGO`, group `NGO_GROUP` | **TYPE SEEDED** |
| Catalog VS-010 | **EDITION DEFINED** |
| Programme / beneficiary domain module | **MISSING** |

### Reusable from SME / platform

| Capability | Source | Reuse mode |
|------------|--------|------------|
| Business setup | BP-001 | SHARED_PLATFORM |
| Party / groups | BP-002 | SHARED_PLATFORM |
| CRM / engagement | BP-004 | SHARED_PLATFORM |
| Documents | ENG-015 / BP-002 | SHARED_PLATFORM |
| Payments (donations / fees if commercial) | BP-007 | SHARED_PLATFORM |
| Sales (if NGO sells goods/services) | BP-006 | SHARED_PLATFORM |

### Required NGO-specific (future)

| Capability | Status |
|------------|--------|
| CAP-IND-010 Manage programmes | **VISION** |
| CAP-IND-011 Manage beneficiaries | **VISION** |
| J-IND-010 Create programme | **VISION** |
| NGO template / edition experience | **MISSING** |

### Blockers for Launch 3

1. No Programme Management domain  
2. Beneficiary model not implemented as distinct from Party roles  
3. Field/programme journey specs not frozen as IPs  
4. Depends on SME Customer Web / Staff Web stability

### Likely future slices (not implemented)

| Slice | Journey | Status |
|-------|---------|--------|
| SL-NGO-001 Programme setup | Staff | **PLANNED** |
| SL-NGO-002 Beneficiary registration | Staff | **PLANNED** |
| SL-NGO-003 Programme activity tracking | Staff | **PLANNED** |

---

## Architecture validation (all launches)

All editions **must** follow:

```text
Industry → Business Type → Edition/Template → Actor → Journey → Capability
→ Slice → Channel → Domain → BP/IP → Engine → Data
```

| Principle | Affirmed |
|-----------|----------|
| BPs remain domain ownership boundaries | Yes |
| Engines remain reusable platform services | Yes |
| Capabilities = business actions | Yes |
| Journeys = actor outcomes | Yes |
| Slices = complete certification units | Yes |
| Channels do not contain business logic | Yes |
| Editions configure/compose shared capabilities | Yes |
| Industry-specific domains only when genuinely required | Yes |
| AI/conversational cannot bypass capability authorization | Yes |

---

## Related documents

- [SME Digitization Edition Definition](./SME%20Digitization/SME-Digitization-Edition-Definition.md)
- [SME Digitization MVP Scope](./SME%20Digitization/SME-Digitization-MVP-Scope.md)
- [SME Digitization Journey Map](./SME%20Digitization/SME-Digitization-Journey-Map.md)
- [SME Digitization Slice Register](./SME%20Digitization/SME-Digitization-Slice-Register.md)
- [SME Edition Gap & Decision Register](./SME%20Digitization/SME-Edition-Gap-and-Decision-Register.md)

---

*No production code authorized by this document.*
