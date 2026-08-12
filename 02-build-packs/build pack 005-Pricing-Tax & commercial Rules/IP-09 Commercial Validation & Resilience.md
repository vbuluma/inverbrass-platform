# BP-005 IP-09 – Commercial Validation & Resilience

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-09 |
| Build Pack | BP-005 – Pricing, Tax & Commercial Rules |
| Priority | Critical |
| Depends On | IP-01–IP-06 |
| Scope coverage | SC-015 |

---

## Objective

Ensure commercial resolution is **fail-closed, deterministic and integrity-checked**: validate configuration, currency, calculations, rounding and dependencies; emit structured errors; never silently invent fallback commercial values.

---

## Business Problem

Silent defaults (missing tax → 0, missing price → last known) create financial and compliance risk. Commercial engines must fail explicitly with actionable errors and guarantee repeatability for identical inputs and rule versions.

---

## Scope

### Included

- Pre-calculation validation that required commercial configuration exists
- Explicit failure on missing/invalid configuration
- Currency consistency validation
- Component calculation integrity and reconciliation checks
- Circular dependency detection (with IP-02)
- Structured error model for commercial-resolution failures
- Determinism / repeatability guarantees
- Resilience patterns: no silent fallback payables

### Excluded

- UX copywriting for all industries (ENG-003k may label errors)
- Retry of external payment networks (BP-007)
- Auto-healing by inventing rates/prices

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Validate required commercial configuration before calculation. |
| BR-002 | Fail explicitly when configuration is missing or invalid. |
| BR-003 | Validate currency consistency and component integrity. |
| BR-004 | Provide structured errors identifying resolution failures. |
| BR-005 | Guarantee deterministic, repeatable results for identical inputs and rule versions. |

---

## Functional Requirements

| ID | Requirement | Pack FR |
|----|-------------|---------|
| FR-001 | Validate that required commercial configuration exists before calculation. | FR-039 |
| FR-002 | Fail explicitly when required commercial configuration is missing or invalid. | FR-040 |
| FR-003 | Validate currency consistency and component calculation integrity. | FR-041 |
| FR-004 | Provide structured errors identifying commercial-resolution failures. | FR-042 |
| FR-005 | Commercial resolution shall be deterministic and repeatable for identical inputs and rule versions. | FR-043 |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | No silent zero-tax / zero-price fallback when configuration is required. |
| BRU-002 | Mixed currencies in one resolution context fail unless FX policy is explicitly configured (FX may be future; v1 fail closed). |
| BRU-003 | Reconciliation failure after rounding policy → hard error. |
| BRU-004 | Structured errors include code, message, field/context, ruleId where applicable. |
| BRU-005 | Validation runs at configuration save (IP-08) and at resolution time. |

---

## Structured Error Categories (illustrative)

| Code family | Example |
|-------------|---------|
| CFG_MISSING | No price item / tax rule for context |
| CFG_INVALID | Circular component graph |
| CONFLICT | Unresolved rule conflict (IP-05) |
| CURRENCY | Currency mismatch |
| INTEGRITY | Components do not reconcile |
| AUTH | Business isolation / permission failure |

---

## High-Level Process Flow

```
Incoming resolve request
        ↓
Auth + business isolation
        ↓
Pre-validate configuration presence
        ↓
Execute pipeline (IP-01…IP-06)
        ↓
Post-validate integrity / rounding / reconcile
        ↓
OK → result | FAIL → structured error (no payable)
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Required config matrix | What must exist per offering/channel |
| Error catalogue | Stable error codes for IP-10 consumers |
| Determinism checks | Optional hash compare in test harness |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| IP-01–IP-08 | Validation points |
| IP-06 | Gate resolution success |
| IP-10 | Error contract for consumers |
| ENG-013 | Optional audit of repeated failure patterns |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Resolution failure rates | By error code |
| Top missing configuration | Operational remediation |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Missing required price fails with CFG_MISSING (or equivalent), no invented amount. |
| AC-002 | Currency mismatch fails closed. |
| AC-003 | Integrity failure fails closed. |
| AC-004 | Identical inputs + versions → identical success payload. |
| AC-005 | Error payload is machine-readable for BP-006/BP-007. |

---

## Document Control

| Item | Value |
|------|-------|
| Status | Draft — awaiting approval |
| Related FRs | FR-039–FR-043 |
