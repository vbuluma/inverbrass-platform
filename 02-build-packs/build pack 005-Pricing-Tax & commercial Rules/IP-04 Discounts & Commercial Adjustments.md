# BP-005 IP-04 – Discounts & Commercial Adjustments

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-04 |
| Build Pack | BP-005 – Pricing, Tax & Commercial Rules |
| Priority | High |
| Depends On | IP-01, IP-02, ENG-004, ENG-005 |
| Scope coverage | SC-008 |

---

## Objective

Support **fixed and percentage discounts** (and related commercial adjustments) with configurable eligibility, validity windows, limits and approval thresholds — producing discount components that feed charge composition without ad-hoc UI math.

---

## Business Problem

Discounts applied inconsistently in frontends or by sales staff create revenue leakage and audit exposure. Eligibility, stacking, caps and approvals must be governed centrally and explained on the commercial result.

---

## Scope

### Included

- Fixed and percentage discounts
- Configurable eligibility and validity conditions
- Discount limits (caps, max %, max amount) and approval thresholds
- Discount component emission into IP-02 composition
- Optional workflow approval via ENG-005 when thresholds are exceeded
- Traceability of discount rule identity and version on the result

### Excluded

- Full marketing campaign orchestration (BP-004 IP-11)
- Loyalty programme point engines (future)
- Payment-time waivers executed as payment adjustments (BP-007 — may consume expected commercial separately)
- Arbitrary line overrides without rule or governed exception (if allowed, must be explicit exception path with audit — governed under IP-08)

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Support fixed and percentage discounts. |
| BR-002 | Support configurable eligibility and validity conditions. |
| BR-003 | Support discount limits and approval thresholds where configured. |
| BR-004 | Emit discount as a first-class commercial component with basis. |
| BR-005 | Prevent silent application of conflicting discounts (coordinate with IP-05). |

---

## Functional Requirements

| ID | Requirement | Pack FR |
|----|-------------|---------|
| FR-001 | Support fixed and percentage discounts. | FR-021 |
| FR-002 | Support configurable discount eligibility and validity conditions. | FR-022 |
| FR-003 | Support discount limits and approval thresholds where configured. | FR-023 |
| FR-004 | Retain discount rule identity and calculation basis on the component. | FR-011, FR-026 |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Discount validity is effective-dated; expired discounts cannot apply to new resolutions. |
| BRU-002 | Eligibility failure means discount is not applied — not replaced by a different discount without IP-05. |
| BRU-003 | Exceeding approval threshold blocks commitment until ENG-005 approval (or configured override role). |
| BRU-004 | Stacking of multiple discounts follows IP-05 precedence / stacking policy. |
| BRU-005 | Percentage discounts declare basis (principal only, pre-tax, post-fee, etc.) explicitly. |

---

## High-Level Process Flow

```
Resolution context
        ↓
Find candidate discounts (eligibility + validity)
        ↓
Apply limits / caps
        ↓
If threshold exceeded → approval required (ENG-005)
        ↓
Resolve conflicts / stacking (IP-05)
        ↓
Emit discount component(s) → IP-02
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Discount types | Fixed, percentage, promotional codes (if used) |
| Eligibility | Segment, channel, offering, quantity, party attributes |
| Validity | Start/end, usage limits |
| Caps | Max amount / max percent |
| Approval thresholds | Amount or % triggering ENG-005 |
| Stacking policy | Exclusive vs additive |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| IP-02 | Discount component |
| IP-05 | Conflict and precedence |
| IP-08 | Governance of discount configuration |
| ENG-004 | Eligibility rules |
| ENG-005 | Threshold approvals |
| ENG-013 | Audit of approved exceptions |
| BP-004 IP-10 | Future: quotations consume resolved discounts (not recalculate) |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Discount utilisation | Frequency and value by rule |
| Threshold approvals | Pending / approved / rejected |
| Stacking outcomes | Applied vs suppressed discounts |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Fixed and percentage discounts calculate correctly against configured basis. |
| AC-002 | Ineligible or expired discounts are not applied. |
| AC-003 | Limits/caps are enforced. |
| AC-004 | Threshold breaches require approval before commercial commit where configured. |
| AC-005 | Applied discount rule identity appears in resolution provenance. |

---

## Document Control

| Item | Value |
|------|-------|
| Status | Implemented in `03-platform` (2026-08-12) |
| Related FRs | FR-021–FR-023 |
| Smoke | `npx tsx scripts/bp005-ip04-discount-adjustment-smoke-validation.ts` — **PASS** |
| Migrations | None |
| UX | No new UI introduced in IP-04 |

---

## Implementation Status

### Architecture flow (implemented)

```text
IP-01 ResolvedBasePrice
  → IP-03 TaxResolution
  → IP-04 CommercialAdjustmentService
  → IP-02 CommercialCompositionService
  → ResolvedCommercialComposition
```

Via `AdjustmentAwareCommercialCompositionService`.

### Files created

| File | Purpose |
|------|---------|
| `03-platform/src/modules/commercial/services/discount-calculation-rules.ts` | Percentage/fixed discount & surcharge calculation |
| `03-platform/src/modules/commercial/services/discount-applicability-rules.ts` | Eligibility, validity, quantity gates |
| `03-platform/src/modules/commercial/services/commercial-adjustment-service.ts` | Adjustment resolution orchestrator |
| `03-platform/src/modules/commercial/services/commercial-adjustment-bridge.ts` | `AdjustmentAwareCommercialCompositionService` bridge |
| `03-platform/scripts/bp005-ip04-discount-adjustment-smoke-validation.ts` | IP-04 smoke validation (TC-01…TC-13) |

### Files modified

| File | Change |
|------|--------|
| `03-platform/src/modules/commercial/constants.ts` | Adjustment-related constants |
| `03-platform/src/modules/commercial/errors.ts` | IP-04 error codes |
| `03-platform/src/modules/commercial/types.ts` | Adjustment resolution contracts |
| `03-platform/src/modules/commercial/index.ts` | Public exports |
| IP-01 / IP-02 / IP-03 docs | UX / Interaction Standards (boundary) sections added |
| This document | Document Control, Implementation Status, prompt archive |

### Contracts introduced

- `CommercialAdjustmentRuleConfiguration`
- `CommercialAdjustmentResolutionRequest` / `CommercialAdjustmentResolutionResult`
- `ResolvedCommercialAdjustment`
- `AdjustmentAwareCommercialCompositionService`

### UX boundary

**No new UI** — backend only. Platform UX standards (progressive workflow, contextual errors, loading/success states, empty states, responsive layout, accessibility) apply when a future workspace/UI consumes these contracts. Downstream UI consumers MUST reuse BP-001–BP-004 platform components and patterns.

### Intentional boundaries / known gaps

- No `discount_rule` persistence
- ENG-005 approval is fail-closed threshold only
- IP-05 full stacking deferred (exclusive ties conflict)
- Quantity gates are contract-only

---

## Implementation Prompt (archived)

The full IP-04 implementation prompt from the user session is archived with this document. Condensed archive of mandatory instructions (sections 1–21):

---

### 1. Role

Act as the implementation engineer for **BP-005 IP-04 — Discounts & Commercial Adjustments** only.

Implement **only IP-04**. Do not implement IP-05+, payment, billing, receipting, inventory, checkout, or order processing. Do not redesign BP-003 pricing or duplicate IP-01/IP-02/IP-03 ownership.

### 2. Architecture boundaries

```text
IP-01 ResolvedBasePrice
  → IP-03 TaxResolution
  → IP-04 CommercialAdjustmentService
  → IP-02 CommercialCompositionService
  → ResolvedCommercialComposition
```

- BP-003 owns base price masters; BP-005 owns commercial meaning.
- IP-01 owns applicable base price; IP-02 owns composition; IP-03 owns tax; IP-04 owns discounts/surcharges/adjustments.
- Bridge via `AdjustmentAwareCommercialCompositionService` — do not bypass IP-01/IP-02/IP-03.

### 3–6. Discount model

- Calculation methods: `PERCENTAGE`, `FIXED`
- Adjustment kinds: `DISCOUNT`, `SURCHARGE`
- Emit as first-class commercial components into IP-02 (`DISCOUNT` / `SURCHARGE` type codes)
- Basis options: `PRINCIPAL`, `COMMERCIAL_SUBTOTAL` (declare basis explicitly; no silent basis invention)
- Effective dating, eligibility, caps/limits, and approval thresholds where configured

### 7. IP-05 conflict boundary

- Full stacking / precedence remains IP-05
- Exclusive ties must fail closed (conflict) — do not silently pick a winner
- IP-04 may apply deterministic single-rule or non-conflicting additive cases only within documented bounds

### 14. UX / Interaction Standards (boundary)

**No new UI introduced in this IP.**

This IP is a backend commercial-resolution capability. Platform UX standards (progressive workflow, contextual errors, loading/success states, empty states, responsive layout, accessibility) apply when a future workspace/UI consumes these contracts.

Downstream UI consumers MUST reuse BP-001–BP-004 platform components and patterns — do not invent a separate UX for commercial resolution.

**NB:** UX / Interaction Standards (boundary) sections were also added to IP-01, IP-02, and IP-03 documentation (missing UX boundary fix).

### 15. UX MUST NOT EXPAND SCOPE

- Do **not** create discount admin screens, quotation discount pickers, or commercial workspaces in IP-04
- Do **not** invent a separate UX language for commercial resolution
- UI consumption is deferred to future IPs/workspaces that reuse BP-001–BP-004 patterns

### Tests (TC-01…TC-13)

At minimum prove:

| TC | Scenario |
|----|----------|
| TC-01 | Percentage discount on PRINCIPAL |
| TC-02 | Fixed discount |
| TC-03 | Percentage surcharge |
| TC-04 | Basis COMMERCIAL_SUBTOTAL |
| TC-05 | Eligibility failure → not applied |
| TC-06 | Expired / not-yet-valid → not applied |
| TC-07 | Cap / max amount enforced |
| TC-08 | Cap / max percent enforced |
| TC-09 | Approval threshold → fail-closed (ENG-005 stub) |
| TC-10 | Provenance (rule id / version / basis) |
| TC-11 | Exclusive conflict / tie → fail closed (IP-05 boundary) |
| TC-12 | Tenant / business isolation |
| TC-13 | Composition bridge → IP-02 components + payable |

### Quality gates

- typecheck / lint on IP-04 files PASS
- IP-04 smoke PASS
- No new migrations unless explicitly required (none expected for contract-first)
- Do not break IP-01 / IP-02 / IP-03 smokes

### 21. Stop after IP-04

Do not proceed to IP-05+. Provide handover: status, files created/modified, architecture flow, contracts, tests, quality gates, gaps, confirmation that later IPs were not implemented.

**Documentation preservation:** Retain this archive in `IP-04 Discounts & Commercial Adjustments.md`. Update Document Control to Implemented with smoke path and UX: no new UI.
