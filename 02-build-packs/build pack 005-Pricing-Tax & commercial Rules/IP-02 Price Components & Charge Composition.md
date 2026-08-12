# BP-005 IP-02 – Price Components & Charge Composition

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-02 |
| Build Pack | BP-005 – Pricing, Tax & Commercial Rules |
| Priority | Critical |
| Depends On | IP-01, ENG-004 |
| Scope coverage | SC-005, SC-006, SC-009 |

---

## Objective

Define the **commercial component model** and **charge composition** so that a payable amount is built from principal, commission, fees, surcharges, discounts, tax, levies and other configurable components — with dependencies, calculation order, precision and mathematical reconciliation.

---

## Business Problem

A single “price” is insufficient for enterprise commerce. Businesses need transparent breakdowns (principal vs tax vs commission), consistent rounding, and component integrity so Sales, Payments and Assurance can trust the composition without recalculating it.

---

## Scope

### Included

- Configurable commercial component types with unique identity
- Principal/base, commission, fee, surcharge, discount, tax, levy and extensible component kinds
- Calculation basis retained per component
- Component dependencies and defined calculation order
- Prevention of circular dependencies
- Internal decimal precision and currency rounding consistency (with IP-03 / IP-09)
- Mathematical reconciliation: components must sum/reconcile to the commercial result
- Charge composition producing final payable candidate for IP-06

### Excluded

- Tax rate master and tax applicability policy detail (IP-03 owns tax rules; IP-02 provides the tax *component slot*)
- Discount eligibility policy detail (IP-04)
- Rule conflict arbitration (IP-05)
- Snapshot persistence (IP-06)
- Payment split / allocation (BP-007)

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Decompose commercial amounts into configurable components. |
| BR-002 | Support principal, commission, fee, surcharge, discount, tax, levy and other configured types. |
| BR-003 | Each component has unique type/identity and retained calculation basis. |
| BR-004 | Component dependencies and calculation order are explicit and cycle-free. |
| BR-005 | Component values reconcile mathematically to the resulting commercial amount. |
| BR-006 | Future component types can be added without redesigning the transaction commercial model (NFR-010). |

---

## Functional Requirements

| ID | Requirement | Pack FR |
|----|-------------|---------|
| FR-001 | Support decomposition of a commercial amount into configurable components. | FR-008 |
| FR-002 | Support principal/base, commission, fee, surcharge, discount, tax, levy and other configurable components. | FR-009 |
| FR-003 | Assign unique type/identity to each commercial component. | FR-010 |
| FR-004 | Retain calculation basis for each component. | FR-011 |
| FR-005 | Support component dependencies and defined calculation order. | FR-012 |
| FR-006 | Prevent circular component dependencies. | FR-013 |
| FR-007 | Maintain sufficient internal precision and apply configured currency rounding consistently. | FR-014 |
| FR-008 | Ensure component values reconcile mathematically to the resulting commercial amount. | FR-015 |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Principal/base is derived from IP-01 resolved base price (adjusted by quantity/method as applicable). |
| BRU-002 | Calculation order is configuration-driven; default order must be documented per business template. |
| BRU-003 | Circular dependency graphs are rejected at configuration validation (IP-09) and at runtime. |
| BRU-004 | Rounding is applied per currency rules; intermediate precision exceeds display precision. |
| BRU-005 | Floating-point binary types must not be used for monetary calculation (NFR-003). |
| BRU-006 | Component codes are stable identifiers for downstream contracts (IP-10). |

---

## Critical Example (composition)

| Component | Calculation Basis | Amount |
|-----------|-------------------|--------|
| Principal | Base price | 850.00 |
| Commission | Configured rule | 50.00 |
| Tax | Taxable basis × tax rate | 100.00 |
| Customer Payable | Resolved total | 1,000.00 |

---

## High-Level Process Flow

```
ResolvedBasePrice (IP-01)
        ↓
Load applicable component rules (IP-03/IP-04/ENG-004)
        ↓
Build dependency-ordered component graph
        ↓
Calculate each component with basis + precision
        ↓
Apply currency rounding rules
        ↓
Reconcile components → payable candidate
        ↓
Pass composition result → IP-06
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Component type catalogue | Codes, labels, sign (add/subtract), category |
| Calculation order | Explicit ordered list / dependency edges |
| Rounding mode | Per currency (half-up, banker's, etc.) |
| Precision | Internal vs presentation scale |
| Extensibility | Allow new component types without schema fork |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| IP-01 | Base/principal input |
| IP-03 | Tax component calculation |
| IP-04 | Discount / adjustment components |
| IP-05 | Which component rules win |
| IP-06 | Composition included in resolution result |
| IP-09 | Integrity and circular dependency validation |
| ENG-004 | Rule-driven component applicability |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Composition integrity exceptions | Failed reconciliations |
| Component mix by period | Volume by component type (downstream analytics) |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Composition produces principal + at least one additional component type in the critical example pattern. |
| AC-002 | Circular dependencies are rejected. |
| AC-003 | Components reconcile to payable within configured rounding tolerance (prefer exact reconcile after rounding policy). |
| AC-004 | Calculation basis and component identity are present on every emitted component. |
| AC-005 | Monetary math uses decimal precision, not floating-point. |

---

## Document Control

| Item | Value |
|------|-------|
| Status | Draft — awaiting approval |
| Related FRs | FR-008–FR-015 |
