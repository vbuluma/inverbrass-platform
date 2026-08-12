# BP-005 IP-06 – Commercial Resolution & Snapshot

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-06 |
| Build Pack | BP-005 – Pricing, Tax & Commercial Rules |
| Priority | Critical |
| Depends On | IP-01–IP-05, IP-09 |
| Scope coverage | SC-011, SC-012 |

---

## Objective

Provide a reusable **commercial-resolution service/API** that returns the complete commercial breakdown and final payable, and capture an **immutable transaction commercial snapshot** when a commercial transaction is committed — so later configuration changes cannot rewrite history.

---

## Business Problem

Sales, Payments and Assurance need one authoritative answer for “what was/should be charged.” Without a resolution API and snapshot, each consumer recalculates differently, and historical amounts drift when rules change.

---

## Scope

### Included

- Reusable commercial-resolution service/API
- Complete commercial breakdown + final payable in the result
- Capture resolved result as transaction snapshot on commercial commit
- Immutability of committed snapshots against subsequent pricing/tax/rule changes
- Distinction between **current configured** prices/rules and **historically applied** amounts
- Embedding of rule explanation / provenance from IP-05

### Excluded

- Creating sales orders or checkout flows (BP-006 consumes this API)
- Executing payments (BP-007)
- Expected-amount control views beyond snapshot (IP-07 specializes expected amounts)
- Downstream contract packaging details (IP-10)

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Provide a reusable commercial-resolution service for all consumers. |
| BR-002 | Resolution result contains complete breakdown and final payable. |
| BR-003 | On commit, persist immutable commercial snapshot. |
| BR-004 | Current configuration changes must not alter committed snapshots. |
| BR-005 | Distinguish current configured prices from historically applied prices. |

---

## Functional Requirements

| ID | Requirement | Pack FR |
|----|-------------|---------|
| FR-001 | Provide a reusable commercial-resolution service/API. | FR-028 |
| FR-002 | Resolution result contains complete commercial breakdown and final payable amount. | FR-029 |
| FR-003 | Capture resolved commercial result as a transaction snapshot when a commercial transaction is committed. | FR-030 |
| FR-004 | Changes to current pricing or tax configuration shall not retroactively alter committed transaction snapshots. | FR-031 |
| FR-005 | Distinguish current configured prices from prices actually applied to historical transactions. | FR-032 |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Quote/preview resolutions may be ephemeral; commit creates snapshot. |
| BRU-002 | Snapshots are append-only; corrections require governed reverse/adjust flows (future), never silent overwrite. |
| BRU-003 | Snapshot stores amounts, components, rule versions, currency, rounding mode and explanation. |
| BRU-004 | Resolution without required configuration fails via IP-09 — no partial payable invent. |
| BRU-005 | API enforces authorization and `businessId` isolation (NFR-006). |

---

## High-Level Process Flow

```
resolveCommercial(request)
        ↓
IP-09 pre-validate
        ↓
IP-01 base price → IP-05 precedence
        ↓
IP-03 / IP-04 components → IP-02 composition
        ↓
IP-09 post-validate integrity
        ↓
Return CommercialResult (preview)
        ↓
[on commit] persist CommercialSnapshot (immutable)
        ↓
IP-07 derives Expected Commercial Amount
```

---

## Resolution Result (logical)

| Element | Description |
|---------|-------------|
| Header | businessId, currency, payable total, effective date, mode |
| Components[] | type, amount, basis, ruleId, ruleVersion |
| Provenance | catalogues, price item, explanation |
| Meta | rounding policy, calculation id, deterministic hash (optional) |

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Snapshot retention | Retention / archive policy |
| Preview TTL | Optional cache for quote previews |
| Commit callers | Allowed consuming modules (BP-006, BP-004 quotes, etc.) |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| IP-01–IP-05, IP-09 | Resolution pipeline |
| IP-07 | Expected amounts from snapshot / result |
| IP-10 | Stable DTO / API contract |
| BP-006 | Order/checkout commit hook |
| BP-004 IP-10 | Quotation may preview/resolve (future alignment) |
| BP-007 | Read snapshot / expected payable |
| ENG-013 | Audit commit of snapshot |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Snapshot volume | Commits by day/module |
| Preview vs commit ratio | Operational health |
| Immutable integrity checks | Detect any illegal mutation attempts |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | API returns full breakdown + payable for the critical example. |
| AC-002 | Commit persists snapshot; subsequent tax rate change does not alter it. |
| AC-003 | Current price enquiry and historical snapshot enquiry are distinct operations. |
| AC-004 | Unauthorized cross-business resolution is rejected. |
| AC-005 | Identical inputs + rule versions produce identical results (NFR-001). |

---

## Document Control

| Item | Value |
|------|-------|
| Status | Draft — awaiting approval |
| Related FRs | FR-028–FR-032 |
