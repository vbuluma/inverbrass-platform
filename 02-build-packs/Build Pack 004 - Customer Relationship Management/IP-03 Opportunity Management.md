# BP-004 IP-03 – Opportunity Management

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-03 |
| Build Pack | BP-004 – Customer Relationship Management |
| Priority | High |
| Depends On | IP-01, IP-04, BP-003 |

---

## Objective

Provide configurable sales pipelines with opportunity tracking, stage progression, probability, revenue forecasting, and win/loss analysis linked to CRM accounts and BP-003 offerings.

---

## Business Problem

Sales teams track deals in spreadsheets with inconsistent stages and unreliable forecasts. Management cannot see pipeline health, bottlenecks, or expected revenue. Opportunities must connect customer context (BP-004), offerings (BP-003), and eventual quotations (IP-10) in one governed model.

---

## Scope

### Included

- Opportunity master record
- Configurable pipeline and stages
- Stage probability and expected revenue
- Opportunity products line referencing BP-003 offerings
- Win, loss, and reopen handling
- Pipeline and forecast views
- Competitor and loss reason tracking

### Excluded

- Product catalogue definition (BP-003)
- Pricing engine configuration (BP-003 IP-11)
- Quotation document generation detail (IP-10)
- Order fulfilment

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Support multiple pipelines by product line, channel, or industry. |
| BR-002 | Forecast revenue from stage probability and deal value. |
| BR-003 | Track opportunity lifecycle from open to won or lost. |
| BR-004 | Associate opportunities with accounts, contacts, and offerings. |
| BR-005 | Analyse win/loss patterns for sales improvement. |
| BR-006 | Enforce approval on high-value or late-stage transitions where configured. |
| BR-007 | Track per-owner and cumulative SLA from opportunity creation through win/loss (ENG-003n). |

---

## Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-001 | Create opportunity linked to CRM record, account, and primary contact. |
| FR-002 | Assign opportunity owner and sales team; record assignment history via IP-01 / ENG-003n. |
| FR-003 | Select pipeline and initial stage. |
| FR-004 | Record expected close date, amount, and currency. |
| FR-005 | Apply stage-based default probability; allow override where permitted. |
| FR-006 | Add opportunity line items referencing BP-003 offerings and quantities. |
| FR-007 | Progress opportunity through configured stages with validation. |
| FR-008 | Mark Won with optional link to quotation or order (IP-10). |
| FR-009 | Mark Lost with reason, competitor, and notes. |
| FR-010 | Reopen closed opportunities via governed workflow. |
| FR-011 | Display kanban pipeline and list views with filters. |
| FR-012 | Calculate weighted pipeline and forecast by period. |
| FR-013 | Publish stage and outcome events to timeline and audit. |
| FR-014 | Display current owner, stage duration, total opportunity elapsed time, and SLA status. |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Every opportunity must link to a CRM record and account. |
| BRU-002 | Stage transitions must follow configured pipeline order unless skipped by rule. |
| BRU-003 | Won opportunities require close date and final amount. |
| BRU-004 | Lost opportunities require loss reason. |
| BRU-005 | Line items must reference active BP-003 offerings. |
| BRU-006 | Closed opportunities are read-only except governed reopen. |
| BRU-007 | Owner or stage change that triggers reassignment closes current ENG-003n segment and opens a new segment. |

---

## High-Level Process Flow

```
Create Opportunity
      ↓
Add Offerings (BP-003) + Value
      ↓
Progress Stages → Probability updates
      ↓
Proposal (IP-10) optional
      ↓
Won ──→ Link Quotation/Order
      or
Lost ──→ Capture Reason
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Pipelines and stages | Per industry or business unit |
| Stage probability defaults | Percentage per stage |
| Mandatory fields per stage | Validation rules |
| Loss and competitor reason codes | Metadata lists |
| Forecast periods | Monthly, quarterly |
| Approval thresholds | Value-based workflow triggers |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| IP-01 | CRM record; assignment/SLA contract |
| ENG-003n | Per-owner and total opportunity SLA |
| IP-04 | Customer account and primary contact |
| IP-10 | Quotation on proposal stage |
| BP-003 | Offering and pricing lookup |
| ENG-005 | Stage and win approval workflows |
| ENG-011 | Forecast reports |
| ENG-004 | Eligibility and discount rules (future) |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Pipeline summary | Open opportunities by stage |
| Weighted forecast | Probability-adjusted revenue |
| Win/loss analysis | Rates by owner, product, reason |
| Cycle length | Average days per stage and total; per-owner segment contribution |
| SLA analysis | Time in stage by owner; breaches by team |
| Stale deals | Opportunities past expected close |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Multiple configurable pipelines operational. |
| AC-002 | Stage progression enforces pipeline rules. |
| AC-003 | Offering line items resolve from BP-003 catalogue. |
| AC-004 | Won and lost outcomes captured with required fields. |
| AC-005 | Forecast calculations match configured probabilities. |

---

## Customer 360 Contribution

| Contribution | Description |
|--------------|-------------|
| **Widgets** | Open opportunities count, pipeline value, stage summary, win/loss indicator |
| **Insights** | Largest open opportunity, forecast value, days in current stage |
| **Timeline** | `OPPORTUNITY_CREATED`, `STAGE_CHANGED`, `OPPORTUNITY_WON`, `OPPORTUNITY_LOST` |

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| IP-01, IP-04 | CRM and account context |
| BP-003 IP-01, IP-11 | Offerings and pricing |
| ENG-005 | Approvals |
| ENG-011 | Reporting |
