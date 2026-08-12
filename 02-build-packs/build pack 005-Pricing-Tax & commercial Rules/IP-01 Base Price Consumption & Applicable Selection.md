# BP-005 IP-01 – Base Price Consumption & Applicable Selection

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-01 |
| Build Pack | **BP-005** – Pricing, Tax & Commercial Rules |
| Priority | Critical |
| Depends On | BP-001, **upstream** BP-003 IP-011 (read-only), ENG-004 |
| Scope coverage | SC-001, SC-002, SC-003, SC-004 |
| Clarification | This is a **BP-005** IP. It does **not** implement BP-003. |

---

## Objective

Provide deterministic **base-price consumption and candidate selection** for commercial transactions by reading BP-003 offering prices — **without owning or duplicating the price master**. Winning-price arbitration among candidates is owned by **IP-05**.

### Pack principle (mandatory)

> **BP-003 defines what a product/offering costs. BP-005 determines what that price means commercially for a specific transaction.**

IP-01 answers: *which BP-003 base/unit price candidates match this commercial context?*  
**IP-05** answers: *which candidate wins under precedence/conflict rules?*  
Tax, discount, commission, payable and snapshot are owned by later BP-005 IPs.

---

## Business Problem

Businesses need multiple catalogues, channels, segments, currencies and effective-dated prices. BP-003 IP-011 already stores offering unit prices. Downstream packs must not invent their own price lookup. BP-005 must resolve *which* price applies for a commercial context and retain provenance of that selection for charge composition and snapshots.

---

## Architecture Boundary (mandatory)

| Owner | Responsibility | Example |
|-------|----------------|---------|
| **BP-003 IP-011** | Configured / base price master; Product Workspace Pricing UI | Product X = KES 1,000 |
| **BP-005 IP-01** | Consume BP-003 prices; identify candidate applicable prices for transaction dimensions; pass candidates/context to **IP-05**; consume the returned winner; retain catalogue/item/method provenance | Candidates → IP-05 → winner base = 1,000 |
| **BP-005 IP-05** | Deterministic precedence / conflict resolution over candidates; returns the single winning price (or explicit failure) | Winner + explanation |
| **BP-005 IP-02…IP-07** | Commercial meaning: components, tax, discount, commission, payable, expected amounts | Payable 1,230 with breakdown |
| **Not BP-005** | Second pricing master, payment split, actual-vs-collected RA | — |

> IP-01 **consumes** BP-003. It does **not** replace `pricing_catalogue` / `pricing_item` / `pricing_method` or the Product Workspace Pricing tab.

---

## Scope

### Included

- Consume multiple pricing catalogues / price lists per business (BP-003)
- Consume configurable pricing methods (fixed, tiered, usage, etc. as configured in BP-003)
- Effective-dated price selection and pricing lifecycle awareness (active / future / expired)
- Identify candidate unit/base prices using dimensions: product/offering, customer context, channel, catalogue, currency, quantity, effective date
- Pass candidate prices and resolution context to **IP-05** for deterministic precedence / conflict resolution; consume the returned winner (IP-01 does not independently arbitrate conflicts)
- Retain the pricing rule / catalogue / price item identity used to derive the resolved price
- Expose resolved base price into the commercial resolution pipeline (IP-06)

### Excluded

- Creating or owning product/offering master (BP-003)
- Replacing BP-003 pricing CRUD UI as the master of unit prices (Product Workspace Pricing remains BP-003)
- Precedence / conflict arbitration among multiple matching prices (owned by **IP-05**)
- Tax, discounts, commissions composition (IP-02–IP-04)
- Transaction snapshot persistence (IP-06)
- Payment or order creation (BP-006 / BP-007)

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Support multiple pricing catalogues per business via BP-003 consumption. |
| BR-002 | Support configurable pricing methods without hardcoding industry models. |
| BR-003 | Support effective-dated pricing so future prices do not alter current resolution incorrectly. |
| BR-004 | Resolve the applicable price using configured commercial dimensions. |
| BR-005 | Retain provenance of catalogue / price item / method used for each resolution. |
| BR-006 | Keep offering master independent from commercial resolution logic. |

---

## Functional Requirements

| ID | Requirement | Pack FR |
|----|-------------|---------|
| FR-001 | Resolve price against multiple pricing catalogues per business. | FR-001 |
| FR-002 | Honour configured pricing methods when selecting / interpreting price. | FR-002 |
| FR-003 | Support effective-dated pricing selection. | FR-003 |
| FR-004 | Respect pricing lifecycle states (e.g. draft/active/expired as provided by BP-003). | FR-004 |
| FR-005 | Resolve applicable price using product, customer, channel, catalogue, currency, quantity and effective date. | FR-005 |
| FR-006 | Identify candidate applicable prices and pass candidates/context to **IP-05** for deterministic precedence/conflict resolution; consume the winner returned by IP-05. | FR-006 |
| FR-007 | Retain pricing rule/catalogue/price-item identity on the resolution result. | FR-007 |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Resolution must be scoped by `businessId`. |
| BRU-002 | For a given dimension combination and effective date, the resolution outcome is a single winning price — **guaranteed by IP-05** precedence/conflict resolution over IP-01 candidates (no silent pick by IP-01). |
| BRU-003 | Expired prices are not selected for new resolutions after expiry. |
| BRU-004 | Future-dated prices apply only when the resolution effective date reaches them. |
| BRU-005 | Missing required price configuration fails explicitly (IP-09) — no invented default price. |
| BRU-006 | Resolved base price feeds principal/base component in IP-02; it is not the final payable. |

---

## High-Level Process Flow

```
Resolution Request
  (businessId, offering, party/customer, channel, catalogue?, currency, qty, date)
        ↓
Load candidate price items from BP-003 IP-011
        ↓
Filter by effective dating + lifecycle + dimensions
        ↓
Pass candidates + context → IP-05
  (IP-05 owns precedence / conflict resolution)
        ↓
Receive winning price item + method from IP-05
  (or explicit failure if unresolved)
        ↓
Emit ResolvedBasePrice + provenance → IP-02 / IP-06
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Default catalogue | Per business / channel / segment |
| Dimension priority | Catalogue vs channel vs segment vs quantity tier |
| Currency defaults | Business operating currency |
| Quantity tier interpretation | Inclusive/exclusive bounds |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| BP-003 IP-011 | Read catalogues, items, methods |
| BP-002 | Optional customer segment / party attributes for dimension matching |
| BP-001 | Business context, currency defaults |
| ENG-004 | Precedence / eligibility decision tables where configured |
| IP-05 | Owns precedence / conflict resolution; IP-01 supplies candidates/context and consumes the returned winner |
| IP-06 | Commercial resolution orchestration |
| IP-09 | Fail-closed validation |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Price resolution coverage | Offerings without resolvable price for default dimensions |
| Catalogue usage | Resolutions by catalogue |
| Ambiguous matches | Near-conflicts detected by IP-05 |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Given valid BP-003 prices and dimensions, IP-01 identifies candidates, obtains the IP-05 winner, and returns a single deterministic base price with provenance. |
| AC-002 | Effective dating filters candidates correctly for past, current and future resolution dates. |
| AC-003 | Ambiguous candidates are passed to IP-05; IP-01 does not silently pick a winner. |
| AC-004 | No new offering unit-price master tables are introduced that duplicate BP-003 IP-011. |
| AC-005 | Resolution is isolated by `businessId`. |

---

## Document Control

| Item | Value |
|------|-------|
| Status | Approved — clarification applied (IP-01 candidates → IP-05 winner) |
| Related FRs | FR-001–FR-007 |
| Clarification | IP-01 identifies candidates; IP-05 owns precedence/conflict resolution and returns the winner |
