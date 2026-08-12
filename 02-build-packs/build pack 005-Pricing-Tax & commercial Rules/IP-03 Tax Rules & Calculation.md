# BP-005 IP-03 – Tax Rules & Calculation

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-03 |
| Build Pack | BP-005 – Pricing, Tax & Commercial Rules |
| Priority | Critical |
| Depends On | IP-01, IP-02, ENG-003b, ENG-004 |
| Scope coverage | SC-007 |

---

## Objective

Maintain **tax types, rates, applicability and calculation rules** — including inclusive/exclusive pricing, taxable basis, effective dating and rounding — so tax components are calculated consistently and retained with full provenance.

---

## Business Problem

Tax treatment varies by jurisdiction, product class, customer type and date. Embedding tax logic in Sales or UI creates inconsistent payables and irreversible audit gaps. Tax must be configuration-driven, effective-dated and explained on every commercial result.

---

## Scope

### Included

- Configurable tax types and rates
- Effective-dated tax rules
- Tax-inclusive and tax-exclusive pricing modes
- Tax applicability rules (product, customer, location/jurisdiction, channel, exemptions)
- Taxable basis determination
- Tax component calculation and rounding (with IP-02)
- Retention of tax type, rate and taxable basis on each tax component
- Consumption of regulatory/localization context via ENG-003b where applicable

### Excluded

- Filing, remittance and tax authority returns (Finance / compliance future)
- GL tax posting (BP-010 / Finance)
- Document generation of tax invoices (ENG-015 / BP-007 billing documents)
- Payment of tax amounts (BP-007)

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Support configurable tax types and rates per business / jurisdiction context. |
| BR-002 | Support effective-dated tax rules without rewriting history. |
| BR-003 | Support tax-inclusive and tax-exclusive pricing. |
| BR-004 | Determine tax applicability via configurable rules. |
| BR-005 | Retain tax type, rate and taxable basis for each tax component. |
| BR-006 | Align with localization/regulatory context (ENG-003b) where configured. |

---

## Functional Requirements

| ID | Requirement | Pack FR |
|----|-------------|---------|
| FR-001 | Support configurable tax types and rates. | FR-016 |
| FR-002 | Support effective-dated tax rules. | FR-017 |
| FR-003 | Support tax-inclusive and tax-exclusive pricing. | FR-018 |
| FR-004 | Determine tax applicability using configurable rules. | FR-019 |
| FR-005 | Retain tax type, rate and taxable basis used for each tax component. | FR-020 |
| FR-006 | Apply currency rounding consistently with IP-02. | FR-014 |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Tax rules are isolated by `businessId` (and jurisdiction keys where configured). |
| BRU-002 | Inclusive pricing must reverse-calculate tax consistently with configured formula. |
| BRU-003 | Exempt or zero-rated treatments must be explicit — not silent omission without rule match. |
| BRU-004 | Multiple applicable taxes must follow IP-05 precedence / stacking configuration. |
| BRU-005 | Committed snapshots retain historical rate/basis even if current rates change (IP-06). |

---

## High-Level Process Flow

```
Composition context (taxable items, mode, jurisdiction, date)
        ↓
Load effective tax rules
        ↓
Evaluate applicability (ENG-004 / configured predicates)
        ↓
Determine taxable basis
        ↓
Calculate tax amount (inclusive or exclusive path)
        ↓
Emit tax component(s) with type, rate, basis → IP-02
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Tax types | VAT, GST, sales tax, levy codes |
| Rates | Rate value, effective from/to |
| Inclusivity default | Per catalogue / channel / offering |
| Applicability | Product tax class, customer tax profile, location |
| Stacking | Compound vs parallel taxes |
| Rounding | Per tax type / currency |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| IP-02 | Tax as commercial component |
| IP-05 | Conflict / multiple-tax precedence |
| IP-06 / IP-07 | Snapshot and expected amounts |
| ENG-003b | Jurisdiction / regulatory context |
| ENG-004 | Applicability decision tables |
| BP-002 | Customer tax attributes where modelled |
| BP-003 | Offering tax class attributes where modelled |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Tax rule inventory | Active rates by jurisdiction/date |
| Tax component totals | Aggregates for downstream assurance (read model) |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Tax-exclusive and tax-inclusive modes produce correct tax and payable for the same net commercial intent. |
| AC-002 | Effective dating selects the correct rate for the resolution date. |
| AC-003 | Each tax component retains type, rate and taxable basis. |
| AC-004 | Missing tax configuration fails explicitly when tax is required (IP-09). |
| AC-005 | Rate changes do not alter committed snapshots. |

---

## Document Control

| Item | Value |
|------|-------|
| Status | Draft — awaiting approval |
| Related FRs | FR-014, FR-016–FR-020 |
