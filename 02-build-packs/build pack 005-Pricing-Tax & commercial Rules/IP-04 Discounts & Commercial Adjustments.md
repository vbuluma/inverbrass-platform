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
| Status | Draft — awaiting approval |
| Related FRs | FR-021–FR-023 |
