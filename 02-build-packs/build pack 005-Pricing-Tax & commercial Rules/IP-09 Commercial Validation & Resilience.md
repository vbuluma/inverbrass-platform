# BP-005 IP-09 – Commercial Validation & Resilience

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-09 |
| Build Pack | BP-005 – Pricing, Tax & Commercial Rules |
| Priority | Critical |
| Depends On | IP-01–IP-08 |
| Scope coverage | SC-015 |
| Related FRs | FR-039–FR-043 |

---

## Objective

Ensure commercial resolution is **fail-closed, deterministic and integrity-checked**: validate configuration, currency, calculations, rounding and dependencies; emit structured errors; never silently invent fallback commercial values.

IP-09 answers:

"Is this commercial resolution safe to produce a payable — or must it fail closed with an actionable, machine-readable error?"

It does **not** calculate price, tax, discount, commission or expected amount. Those remain owned by IP-01–IP-07. Governance lifecycle remains IP-08.

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
- Validation at configuration save (IP-08) and at resolution time

### Excluded

- UX copywriting for all industries (ENG-003k may label errors)
- Retry of external payment networks (BP-007)
- Auto-healing by inventing rates/prices
- IP-10 consumer adapters / IP-11 remittance

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

## Structured Error Categories

| Code family | Example |
|-------------|---------|
| CFG_MISSING | No price item / tax rule for context |
| CFG_INVALID | Circular component graph |
| CONFLICT | Unresolved rule conflict (IP-05) |
| CURRENCY | Currency mismatch |
| INTEGRITY | Components do not reconcile |
| AUTH | Business isolation / permission failure |
| VALIDATION | Cross-cutting validation / silent-fallback forbidden |

---

## High-Level Process Flow

```
Incoming resolve request
        ↓
Auth + business isolation
        ↓
IP-09 Pre-validate configuration presence
        ↓
Execute pipeline (IP-01…IP-06)
        ↓
IP-09 Post-validate integrity / rounding / reconcile
        ↓
OK → result | FAIL → structured error (no payable)
```

Configuration save (IP-08):

```
Create/Edit Draft
        ↓
IP-09 validateCommercialConfigurationPayload
        ↓
OK → persist draft | FAIL → structured error
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Required config matrix | `DEFAULT_COMMERCIAL_REQUIRED_CONFIG` / per-request overrides |
| Error catalogue | `COMMERCIAL_ERROR_CODES` + `COMMERCIAL_ERROR_CODE_FAMILY` |
| Determinism checks | `buildDeterminismFingerprint` / smoke harness |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| IP-01–IP-08 | Validation points |
| IP-06 | Gate resolution success |
| IP-08 | Configuration-save hook |
| IP-10 | Error contract for consumers (`StructuredCommercialErrorPayload`) |
| ENG-013 | Optional audit of repeated failure patterns (not required for IP-09) |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Resolution failure rates | By error code (consumer-side; catalogue ready) |
| Top missing configuration | Operational remediation via actionable hints |

---

## Acceptance Criteria

| ID | Criterion | Status |
|----|-----------|--------|
| AC-001 | Missing required price/config fails with CFG_MISSING (or equivalent), no invented amount. | Met |
| AC-002 | Currency mismatch fails closed. | Met |
| AC-003 | Integrity failure fails closed. | Met |
| AC-004 | Identical inputs + versions → identical success payload. | Met |
| AC-005 | Error payload is machine-readable for BP-006/BP-007. | Met |

---

## Document Control

| Item | Value |
|------|-------|
| Status | Implemented in `03-platform` (2026-08-13) |
| Smoke | `npx tsx scripts/bp005-ip09-commercial-validation-smoke-validation.ts` — **31/31 PASS** |
| Migration | None (service-layer validation; no new tables) |
| UX | `/commercial/resolve` — structured error family/code/hint; no silent payable |
| Related FRs | FR-039–FR-043 |

---

## Implementation Status

**Implemented** in `03-platform` (2026-08-13).

### Architecture boundary (implemented)

Validation sits **around** the commercial pipeline. It does **not** invent prices, tax rates, discounts or payables.

```text
Auth + business isolation
        ↓
IP-09 pre-validate (request + required config)
        ↓
IP-01 → IP-05 → IP-03 → IP-04 → IP-02 → IP-06
        ↓
IP-09 post-validate (currency + integrity + reconcile)
        ↓
OK → CommercialResolution / Snapshot / Expected
FAIL → StructuredCommercialErrorPayload (payableProduced: false)
```

Ownership remains:

| Capability | Owner |
|------------|-------|
| Price master | BP-003 |
| Base price / precedence / tax / adjustments / composition | IP-01–IP-05, IP-02 |
| Snapshot | IP-06 |
| Expected amount | IP-07 |
| Governance / control | IP-08 |
| Validation & resilience | **IP-09** |

### Key artefacts

| Area | Path |
|------|------|
| Rules (pure) | `src/modules/commercial/services/commercial-validation-rules.ts` |
| Service | `src/modules/commercial/services/commercial-validation-service.ts` |
| Pipeline wire | `CommercialResolutionService.resolve` pre/post gates |
| Config-save wire | `CommercialGovernanceService.createDraft` / `updateDraft` |
| Error families | `COMMERCIAL_ERROR_FAMILIES`, `COMMERCIAL_ERROR_CODE_FAMILY` |
| Structured payload | `StructuredCommercialErrorPayload` |
| Smoke | `scripts/bp005-ip09-commercial-validation-smoke-validation.ts` |

### Fail-closed behaviours

- `requireTaxConfiguration` / `requireAdjustmentConfiguration` with empty rules → `REQUIRED_CONFIGURATION_MISSING` / CFG_MISSING
- Currency mismatch across rules/components → `CURRENCY_MISMATCH`
- `allowSilentZeroFallback: true` → `SILENT_FALLBACK_FORBIDDEN`
- `allowMixedCurrency: true` without FX → fail closed (`CURRENCY_MISMATCH`)
- Component sum ≠ payable → `ROUNDING_INTEGRITY_FAILURE`
- Circular component graph at save → `CIRCULAR_COMPONENT_DEPENDENCY`
- Failures never return a payable (`payableProduced: false`)

### Determinism

- `buildDeterminismFingerprint` over monetary commercial identity
- Smoke AC-004: identical inputs → identical fingerprint and payable

### UX

- `/commercial/resolve` step alerts show **family**, **code**, **message**, **actionableHint**
- Explicit note: “No commercial payable was produced.”
- Server actions return structured commercial error fields for consumers

### Quality gates

- Lint / typecheck: IP-09 commercial sources clean (pre-existing unrelated `leads` error in certification script remains)
- Smoke: see smoke section below
- No DB migration / no seed change for IP-09

### Intentional gaps

- No FX conversion path (v1 fail closed)
- No ENG-013 failure-pattern analytics dashboard
- Full nested IP-05…IP-08 smoke trees not re-spawned inside IP-09 (avoids multi-nest timeouts); continuity covered by in-process happy-path + BRU-005 + artifact checks + BP-003 IP-011 / IP-01 spawned regressions
- IP-10 consumer adapters not started

### Downstream integration

- BP-006 / BP-007 / IP-10 consume `StructuredCommercialErrorPayload` and `COMMERCIAL_ERROR_CODE_FAMILY`
- CRM commercial path continues via existing IP-06 resolution service (now gated by IP-09)

---

## Implementation Prompt Archive

This section preserves the complete Cursor implementation prompt used for IP-09 implementation and serves as the authoritative implementation record for this IP.

You are implementing BP-005 – Pricing, Tax & Commercial Rules.

Implementation Package

IP-09 — Commercial Validation & Resilience

Implement IP-09 only.

Do not implement IP-10, IP-11, payments, billing, receipting, orders, inventory, reconciliation, revenue assurance, or tax-remittance functionality.

Do not modify unrelated modules.

1. Objective

Implement fail-closed, deterministic commercial validation and resilience around the existing commercial resolution pipeline.

IP-09 answers:

"Is this commercial resolution safe to produce a payable — or must it fail closed with an actionable, machine-readable error?"

It does not calculate the price, tax, discount, commission or expected amount.

Those remain owned by:

BP-003 → price master
IP-01   → base-price consumption
IP-03   → tax calculation
IP-04   → commercial adjustments
IP-05   → precedence/conflict
IP-02   → composition
IP-06   → commercial snapshot
IP-07   → expected commercial amount
IP-08   → governance/control
IP-09   → validation & resilience

2. Mandatory Architecture Principle

Do not create a second commercial engine.

The validation layer must sit around commercial resolution rather than duplicate it.

Preferred architecture:

Incoming resolve request
        ↓
Auth + business isolation
        ↓
IP-09 Pre-validate configuration presence
        ↓
Existing commercial engine (IP-01…IP-06)
        ↓
IP-09 Post-validate integrity / rounding / reconcile
        ↓
OK → result | FAIL → structured error (no payable)

Where appropriate, validation also runs at configuration save:

IP-08 Create/Edit Draft
        ↓
IP-09 configuration payload validation
        ↓
OK → persist | FAIL → structured error

Do not invent silent fallback payables, zero-tax, or zero-price when required configuration is missing.

Do not introduce circular dependencies.

3. Scope

IP-09 must cover:

- Pre-calculation validation that required commercial configuration exists
- Explicit failure on missing/invalid configuration
- Currency consistency validation
- Component calculation integrity and reconciliation checks
- Circular dependency detection (with IP-02)
- Structured error model for commercial-resolution failures
- Determinism / repeatability guarantees
- Resilience patterns: no silent fallback payables
- Validation at configuration save (IP-08) and at resolution time

Configuration-driven required-config matrix — not hard-coded for one industry.

4. Structured Error Model

Provide machine-readable errors for BP-006 / BP-007 / IP-10 consumers.

At minimum include:

- code (stable)
- family (CFG_MISSING | CFG_INVALID | CONFLICT | CURRENCY | INTEGRITY | AUTH | VALIDATION)
- message
- field / context
- ruleId where applicable
- actionableHint
- stage
- payableProduced: false
- retryable: false for config failures

Reuse existing CommercialError codes where equivalent. Map codes to families.

5. Business Rules (must enforce)

- BRU-001: No silent zero-tax / zero-price fallback when configuration is required
- BRU-002: Mixed currencies fail closed in v1 (no FX silent convert)
- BRU-003: Reconciliation failure after rounding → hard error
- BRU-004: Structured errors include code, message, field/context, ruleId
- BRU-005: Validation runs at configuration save (IP-08) and at resolution time

6. Acceptance Criteria

- AC-001: Missing required price/config fails with CFG_MISSING (or equivalent), no invented amount
- AC-002: Currency mismatch fails closed
- AC-003: Integrity failure fails closed
- AC-004: Identical inputs + versions → identical success payload
- AC-005: Error payload is machine-readable

7. Persistence / Migration

Prefer no new DB tables for IP-09 (service-layer validation).

Do not create pricing/tax masters.

Do not mutate IP-06 snapshot immutability.

8. UX

On `/commercial/resolve`, surface structured failure feedback near the failing step:

- code / family
- message
- actionable hint
- explicit: no payable produced

Do not show a fabricated payable on failure.

9. Testing

Create:

scripts/bp005-ip09-commercial-validation-smoke-validation.ts

Cover:

- missing required configuration fail-closed
- currency mismatch
- integrity / reconcile failure
- circular dependency at config save
- silent fallback forbidden
- structured error payload
- determinism fingerprint match
- IP-06/IP-07 immutability preserved
- regressions for prior commercial IPs (at least IP-01, IP-05, IP-06, IP-07; IP-08 continuity)

10. Quality gates

- lint / typecheck for IP-09 sources
- do not “fix” unrelated pre-existing failures (e.g. certification `leads`)
- migrate/seed only if genuinely required (prefer none)

11. Documentation

Update this IP-09 document with:

- Implementation Status
- Architecture flow
- Artefacts
- Smoke results
- Intentional gaps
- Implementation Prompt Archive (this prompt)

12. Stop Condition

After IP-09 is implemented, tested and documented:

STOP.

Do not start IP-10 or IP-11.

Do not commit.

Do not fix unrelated pre-existing failures.

Return a handover containing:

Status
Files created
Files modified
Architecture flow
Validation model
Structured error contract
UX changes
Smoke-test results
Regression results
Quality gates
Migration/schema/seed impact
Defects fixed
Intentional gaps
Downstream integration points
Confirmation that IP-10+ were not started

Implement IP-09 only, validate it, document it, and stop.
