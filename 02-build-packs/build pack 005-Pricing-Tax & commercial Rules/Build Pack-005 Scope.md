# Build Pack 005 – Pricing, Tax & Commercial Rules

| Attribute | Description |
|-----------|-------------|
| Build Pack | BP-005 |
| Name | Pricing, Tax & Commercial Rules |
| Status | Conditionally approved — YES WITH CHANGES (2026-08-12) |
| Architecture baseline | AV-1.5 / AV-1.7 Build Pack ID realignment |
| Primary engines | ENG-004 Rules Engine, ENG-003b Localization & Regulatory, ENG-003l Checklist & Completion, ENG-005 Workflow, ENG-013 Audit |

---

## Objective

Establish the platform’s **commercial truth**: determine what a customer should be charged, how the amount is composed, which rules produced it, and preserve the commercial basis used for downstream processing.

BP-005 delivers a **Commercial Rules & Resolution Engine** — not a pricing UI. Frontends consume and present the resolved result; they do not independently calculate commercial amounts.

---

## Purpose Statement

Given this business, product/offering, customer, quantity, channel and date:

1. What should be charged?
2. What makes up that amount (principal, tax, fees, commission, discounts, etc.)?
3. Which rules produced it?
4. What should downstream systems regard as the **expected commercial obligation**?

That foundation must be in place before BP-006 Sales, BP-007 Payments, and future Reconciliation / Revenue Assurance.

---

## Scope

### Primary consumers

| Consumer | Use of BP-005 |
|----------|---------------|
| BP-006 Sales, Orders & Service Delivery | Resolve commercial amounts at order/checkout |
| BP-007 Payments, Billing & Receipting | Consume expected payable and component breakdown |
| Future Reconciliation / Revenue Assurance | Compare expected vs actual using snapshot / expected amounts |
| Future Finance | Consume commercial basis without recalculating |

### Primary inputs

- Product/Offering from **BP-003** (including offering unit prices from BP-003 IP-011)
- Customer/party context from **BP-002**
- Channel, quantity, currency, effective date
- Business configuration and applicable commercial rules

### Primary outputs

- Resolved price and component breakdown
- Tax / discount / fee / commission amounts
- Final payable amount
- Transaction commercial snapshot
- Expected commercial amount (header + components)

### Design principles

| Principle | Description |
|-----------|-------------|
| **BP-003 vs BP-005 (mandatory)** | **BP-003 defines what a product/offering costs. BP-005 determines what that price means commercially for a specific transaction.** |
| Backend authority | Commercial calculation is a domain capability; UI may show a simplified total, but components are a mandatory backend representation |
| Single ownership | Offering unit / base prices remain in BP-003 IP-011; BP-005 never becomes a second pricing master |
| Component granularity | Principal, commission, tax, discount, fees, etc. are first-class commercial components (not display-only) |
| Expected ≠ actual | BP-005 owns expected commercial outcome + provenance; actual collected / variance belongs to Payments + later RA |
| Payment split out of scope | How KES 300 is settled (cash + M-Pesa) is BP-007 only; BP-005 states amount due |
| Determinism | Identical inputs + rule versions → identical result |
| Immutability | Committed snapshots are never altered by later rule changes |

---

## Implementation Package Structure

| IP | Module |
|----|--------|
| IP-01 | Base Price Consumption & Applicable Selection |
| IP-02 | Price Components & Charge Composition |
| IP-03 | Tax Rules & Calculation |
| IP-04 | Discounts & Commercial Adjustments |
| IP-05 | Rule Precedence & Conflict Management |
| IP-06 | Commercial Resolution & Snapshot |
| IP-07 | Expected Commercial Amount |
| IP-08 | Commercial Governance |
| IP-09 | Commercial Validation & Resilience |
| IP-10 | Downstream Commercial Contract |

---

## IP Summaries

| IP | Purpose | Depends On |
|----|---------|------------|
| IP-01 | **BP-005:** consume upstream BP-003 prices; select applicable base price for commercial resolution (does not own price master) | BP-001, BP-003 IP-011 (read), ENG-004 |
| IP-02 | Configurable commercial components and charge composition | IP-01, ENG-004 |
| IP-03 | Tax types, rates, inclusive/exclusive, taxable basis, rounding | IP-01, IP-02, ENG-003b, ENG-004 |
| IP-04 | Fixed/percentage discounts, eligibility, limits, approval thresholds | IP-01, IP-02, ENG-004, ENG-005 |
| IP-05 | Precedence, conflict detection, deterministic selection, explanation | IP-01–IP-04, ENG-004 |
| IP-06 | Reusable resolution API + immutable transaction commercial snapshot | IP-01–IP-05, IP-09 |
| IP-07 | Expected payable and component-level expected amounts for controls | IP-06 |
| IP-08 | Versioning, approval, activation, retirement, audit of commercial config | IP-01–IP-05, ENG-005, ENG-013, ENG-003l |
| IP-09 | Validate configuration, currency, calculation integrity; explicit failure | IP-01–IP-06 |
| IP-10 | Stable commercial contract for Sales, Payments, Finance, Assurance | IP-06, IP-07 |

---

## In Scope (SC)

| Scope ID | Capability | Description | Primary IP |
|----------|------------|-------------|------------|
| SC-001 | Price Management | Maintain / consume configurable prices for products and services | IP-01 |
| SC-002 | Pricing Catalogues | Support multiple price lists/catalogues (consume BP-003; extend selection rules) | IP-01 |
| SC-003 | Price Resolution | Determine applicable price using configured business rules | IP-01 |
| SC-004 | Price Effective Dating | Support effective dates and pricing lifecycle | IP-01 |
| SC-005 | Price Components | Decompose amounts into principal, fees, commissions, tax, discounts, etc. | IP-02 |
| SC-006 | Commercial Rules | Configure when and how components apply | IP-02, IP-05 |
| SC-007 | Tax Rules | Tax types, rates, applicability and calculation | IP-03 |
| SC-008 | Discounts | Fixed/percentage discounts and eligibility | IP-04 |
| SC-009 | Charge Composition | Calculate final payable from components | IP-02, IP-06 |
| SC-010 | Rule Precedence | Deterministic precedence among applicable rules | IP-05 |
| SC-011 | Commercial Resolution | Reusable service/API returning resolved commercial result | IP-06 |
| SC-012 | Transaction Snapshot | Preserve commercial result applied to a committed transaction | IP-06 |
| SC-013 | Expected Amount | Expected customer payable and component-level amounts | IP-07 |
| SC-014 | Commercial Governance | Versioning, effective dating, approval and audit | IP-08 |
| SC-015 | Commercial Validation | Validate configuration, currency, calculation, rounding, integrity | IP-09 |
| SC-016 | Downstream Contract | Standard commercial data for Sales, Payments, Finance, assurance | IP-10 |

---

## Out of Scope

| Out-of-Scope Area | Owner / Future Pack | Boundary |
|-------------------|---------------------|----------|
| Product master / catalogue | BP-003 | BP-005 consumes products/offerings; does not manage product identity |
| Offering unit price master tables | BP-003 IP-011 | `pricing_catalogue` / `pricing_item` / `pricing_method` remain BP-003-owned; BP-005 consumes and resolves commercially |
| Party / customer management | BP-002 | BP-005 consumes customer context |
| CRM | BP-004 | No CRM pipeline or engagement; quotations may later consume BP-005 resolution |
| Sales order creation / checkout / fulfilment | BP-006 | BP-005 determines commercial amounts consumed by Sales |
| Payment execution / split payment | BP-007 | BP-005 determines expected payable; does not execute payments |
| Billing / receipting | BP-007 | BP-005 provides commercial basis; billing owns lifecycle |
| Inventory | BP-008 | No stock reservation or movement |
| Payment reconciliation | Future | No matching of actual bank / M-Pesa / payment transactions |
| Revenue Assurance process | Future | BP-005 provides expected commercial data only |
| Financial accounting / GL | Future Finance (BP-010) | No journal posting |
| PDF / document generation | ENG-015 / document capability | BP-005 does not own document generation |
| Customer-facing presentation | Consuming applications | UI displays resolved amounts; calculation remains backend-owned |

---

## Architecture Boundary

| Build Pack | Responsibility |
|------------|----------------|
| BP-002 | Who the person or organisation is (Party) |
| BP-003 | What is offered + **configured/base price master** (IP-011): e.g. Product X = KES 1,000 |
| BP-004 | How we manage customer relationships (CRM / quotations may *call* commercial resolution) |
| **BP-005** | **What that price means commercially for a transaction**: components, tax, discount, commission, payable, rule versions, snapshot, expected amounts |
| BP-006 | Consumes resolved commercial result for orders/checkout/fulfilment |
| BP-007 | Settlement of amount due (payment split, receipting, billing lifecycle) |
| Future RA | Actual-vs-expected / actual-vs-collected assurance (consumes BP-005 expected + provenance) |
| Future Finance | Accounting / revenue recognition consuming commercial components |

### Worked example (boundary)

**BP-003 configured price:** Product X = KES 1,000

**BP-005 resolution (authoritative):**

| Element | Value |
|---------|-------|
| Base / principal | 1,000 |
| Commission | 100 |
| Tax | 180 |
| Discount | −50 |
| Customer payable | 1,230 |
| Components | Explicitly identified |
| Rule versions | Recorded |
| Resolution timestamp | Recorded |

BP-006 consumes this result. BP-007 settles the **1,230** (or whatever amount due) — it does not redefine commercial composition.

### Commercial amount vs payment

| Scenario | BP-005 | BP-006 | BP-007 |
|----------|--------|--------|--------|
| Determine product price | ✅ | | |
| Add commission | ✅ | | |
| Calculate tax | ✅ | | |
| Calculate final payable | ✅ | | |
| Create order | | ✅ | |
| Customer owes KES 300 | Provides amount | ✅ | |
| Pay KES 100 cash + KES 200 M-Pesa | | | ✅ |
| Issue receipt | | | ✅ |
| Compare expected KES 300 vs actual KES 280 | Provides expected basis | | Future reconciliation / assurance |

---

## Critical Commercial Example

Backend produces (mandatory commercial representation):

```
Transaction amount
├── Principal             1,000
├── Commission              100
├── Tax                     180
├── Discount                -50
└── Amount payable        1,230
```

Frontend may show only `Total: KES 1,230` or the full breakdown. Components remain mandatory for accounting, tax/commission reporting, reconciliation, RA, disputes and audit — even when UI is simplified.

---

## Dependencies

**Consumes**

- BP-001 – Business Setup & Onboarding (`businessId` isolation)
- BP-002 – Party & Relationship Management (customer context)
- BP-003 – Product & Service Catalogue (offerings; **IP-011 pricing foundation**)

**Platform engines**

| Engine | Role in BP-005 |
|--------|----------------|
| ENG-004 Rules Engine | Deterministic commercial rule execution, decision tables, eligibility |
| ENG-003b Localization & Regulatory | Jurisdiction / regulatory tax context |
| ENG-003l Checklist & Completion | Commercial configuration readiness gates |
| ENG-005 Workflow | Approval of material commercial configuration / discount thresholds |
| ENG-013 Audit | Material rule change audit trail |
| ENG-003 Configuration | Reference data and business configuration dimensions |
| ENG-003k Industry Experience | Industry-native commercial labels (optional UX) |

---

## Dependency Graph (runtime flow)

IP numbering remains IP-01…IP-10; delivery follows **dependencies**, not numeric order alone.

```
[Upstream dependency — not BP-005 work]
BP-003 Product / Offering + base price master (IP-011)
              │  (read-only input)
              ▼
════════════ BP-005 DELIVERABLES ════════════
     IP-01  Base price consumption & applicable selection
              │
        ┌─────┴─────┐
        ▼           ▼
   IP-04 Discounts  IP-03 Tax rules
        │           │
        └─────┬─────┘
              ▼
     IP-02  Commercial components & charge composition
              │
              ▼
     IP-05  Rules / precedence / eligibility / conflict
              │
              ▼
     IP-08  Governance (effective dating, versioning, approval)
              │         (+ IP-09 validation gates throughout)
              ▼
     IP-06  Commercial resolution API + immutable snapshot
              │
        ┌─────┴─────┐
        ▼           ▼
 IP-07 Expected   Provenance
      amounts     (in snapshot)
        │
        ▼
 IP-10 Downstream commercial contract
═════════════════════════════════════════════
              │
              ▼
   [Downstream consumers]
   BP-006 Sales  →  BP-007 Payment  →  Future Revenue Assurance
```

## Recommended Delivery Sequence (**BP-005 waves only**)

> **Subject = BP-005.** BP-003 IP-011 is an **external prerequisite** (already delivered). It is not a BP-005 implementation wave.

| Wave | BP-005 IPs | Outcome |
|------|------------|---------|
| External prerequisite | *(none — BP-003 IP-011)* | Configured/base price exists to consume |
| **1** — Consume & model | IP-01, IP-02, IP-09 | Select applicable base price; component model; fail-closed |
| **2** — Commercial policy | IP-04, IP-03, IP-05 | Discounts → tax → precedence/eligibility |
| **3** — Governed versions | IP-08 | Effective dating, versioning, activation/audit |
| **4** — Resolve & expect | IP-06, IP-07 | Resolution API, snapshot, expected amounts + provenance |
| **5** — Contract freeze | IP-10 | Stable consumer contract for BP-006/BP-007/Finance/RA |

> Wave 1 may stub IP-09 error codes; full integrity suite hardens as composition and tax land in Waves 1–2.

---

## Non-Functional Requirements (Pack-level)

| NFR ID | Requirement |
|--------|-------------|
| NFR-001 | Commercial calculations shall be deterministic and reproducible. |
| NFR-002 | Historical transaction amounts shall remain immutable from subsequent rule changes. |
| NFR-003 | Monetary calculations shall use appropriate decimal precision (not floating-point). |
| NFR-004 | Currency-specific precision and rounding shall be configurable. |
| NFR-005 | Commercial rules shall be tenant/business isolated using `businessId`. |
| NFR-006 | Commercial resolution shall enforce authorization and business isolation. |
| NFR-007 | Material rule changes shall be auditable. |
| NFR-008 | Failed calculations shall fail explicitly rather than silently producing fallback values. |
| NFR-009 | The commercial-resolution API shall provide a stable contract for downstream Build Packs. |
| NFR-010 | Design shall support future commercial components without redesigning the core transaction model. |
| NFR-011 | Design shall support Finance, Reconciliation and Revenue Assurance without duplicating commercial calculations. |
| NFR-012 | System shall maintain sufficient provenance to explain how a final payable was derived. |

---

## Bottom Line

The core BP-005 deliverable is a **Commercial Rules & Resolution Engine** that answers what should be charged, how it is composed, which rules applied, and what the expected commercial obligation is — before Sales, Payments, and assurance layers are built on top of it.

---

## Document Control

| Item | Value |
|------|-------|
| Source | BP-005 scope brief (Pricing, Tax & Commercial Rules) |
| Related | `01-enterprise-architecture/02-Platform-Module-Catalog.md`, `11-Development-Roadmap.md` |
| Approval | YES WITH CHANGES — Option A confirmed; waves revised; see Review + Traceability Matrix |
| Traceability | `BP-005-Requirements-Traceability-Matrix.md` |
