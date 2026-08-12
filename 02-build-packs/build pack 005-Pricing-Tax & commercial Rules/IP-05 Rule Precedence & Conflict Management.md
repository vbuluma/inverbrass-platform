# BP-005 IP-05 – Rule Precedence & Conflict Management

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-05 |
| Build Pack | BP-005 – Pricing, Tax & Commercial Rules |
| Priority | Critical |
| Depends On | IP-01, IP-02, IP-03, IP-04, ENG-004 |
| Scope coverage | SC-006, SC-010 |

---

## Objective

Ensure commercial rule application is **deterministic**: detect conflicts, apply explicit precedence, never silently pick an arbitrary rule, and provide **traceability / explanation** of which rules were applied (and which were suppressed).

---

## Business Problem

Multiple catalogues, taxes, discounts and component rules often match the same transaction context. Without precedence and conflict handling, payables become non-reproducible and disputes cannot be explained. Commercial trust requires explicit selection and provenance.

---

## Scope

### Included

- Precedence models across price, tax, discount and component rules
- Conflict detection among applicable commercial rules
- Deterministic rule selection (or explicit failure when unresolved)
- Explanation / trace of applied and suppressed rules
- Coordination with commercial-rule versioning (IP-08)
- Integration with ENG-004 decision tables where used

### Excluded

- Authoring of tax/discount/price content (owned by IP-01–IP-04)
- Snapshot storage (IP-06) — consumes explanation payload
- UI-only “best guess” pricing

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Identify conflicting commercial rules. |
| BR-002 | Never silently apply an arbitrary rule when conflicts exist. |
| BR-003 | Provide traceability of rules used to calculate a commercial amount. |
| BR-004 | Support versioned rule evaluation (with IP-08). |
| BR-005 | Produce a human- and machine-readable explanation of selection. |

---

## Functional Requirements

| ID | Requirement | Pack FR |
|----|-------------|---------|
| FR-001 | Apply explicit and deterministic pricing/commercial precedence rules. | FR-006 |
| FR-002 | Identify conflicting commercial rules. | FR-024 |
| FR-003 | Do not silently apply an arbitrary rule where commercial rules conflict. | FR-025 |
| FR-004 | Provide traceability of the rules used to calculate a commercial amount. | FR-026 |
| FR-005 | Support commercial-rule versioning in evaluation context. | FR-027 |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Precedence configuration is mandatory for dimensions that can multi-match. |
| BRU-002 | Unresolved conflicts → explicit resolution failure (IP-09 structured error). |
| BRU-003 | Explanation must include winning rule IDs, versions, and suppressed candidates. |
| BRU-004 | Evaluation is repeatable for identical inputs and rule versions (NFR-001 / FR-043). |
| BRU-005 | Soft “warnings” may be emitted for near-conflicts only when a deterministic winner exists. |

---

## High-Level Process Flow

```
Candidate rules (price / tax / discount / component)
        ↓
Detect overlaps / conflicts
        ↓
Apply precedence matrix / ENG-004 decision
        ↓
Winner selected? ──No──→ Fail explicit (IP-09)
        │
       Yes
        ↓
Attach explanation (applied + suppressed)
        ↓
Continue composition / resolution
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Precedence matrix | By rule family and dimension |
| Conflict severity | Hard fail vs priority win |
| Explanation verbosity | Minimal vs full candidate list |
| Version pin | Evaluate at rule-set version / effective date |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| IP-01–IP-04 | Candidate rule producers |
| IP-06 | Explanation embedded in resolution result |
| IP-08 | Rule versions |
| IP-09 | Conflict failure errors |
| ENG-004 | Decision tables / policy execution |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Conflict incidence | Hard conflicts by period |
| Suppressed rules | Frequency of near-matches |
| Precedence effectiveness | Wins by rule family |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Two equally applicable exclusive discounts do not silently pick one without precedence. |
| AC-002 | Resolution explanation lists applied rule identities and versions. |
| AC-003 | Unresolved conflict returns structured error (no payable invent). |
| AC-004 | Re-running identical inputs + versions yields identical winner set. |

---

## Document Control

| Item | Value |
|------|-------|
| Status | Draft — awaiting approval |
| Related FRs | FR-006, FR-024–FR-027 |
