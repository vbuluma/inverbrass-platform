# BP-005 IP-08 – Commercial Governance

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-08 |
| Build Pack | BP-005 – Pricing, Tax & Commercial Rules |
| Priority | High |
| Depends On | IP-01–IP-05, ENG-005, ENG-013, ENG-003l |
| Scope coverage | SC-014 |

---

## Objective

Govern the commercial configuration lifecycle: **versioning, approval, activation, retirement, effective dating and audit** — preventing uncontrolled changes and protecting configuration needed to interpret historical transactions.

---

## Business Problem

Commercial rules are high-risk configuration. Unapproved changes, silent deletes and missing versions break reproducibility and auditability. Governance must make material changes controlled, auditable and non-destructive to history.

---

## Scope

### Included

- Controlled creation, modification, activation and retirement of commercial rules
- Versioning of commercial configuration (aligned with IP-05 evaluation)
- Effective dating of rule versions
- Approval of material changes via ENG-005 where configured
- Audit of material commercial configuration changes (ENG-013)
- Prevent deletion of configuration required to interpret committed historical transactions
- Optional readiness checklists via ENG-003l (commercial setup complete)

### Excluded

- Day-to-day price item CRUD owned by BP-003 Product Workspace (BP-003 retains offering price master UX; BP-005 may govern commercial policy objects)
- Runtime resolution algorithm (IP-06)
- Payment approvals (BP-007)

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Support controlled creation, modification, activation and retirement of commercial rules. |
| BR-002 | Material commercial configuration changes shall be auditable. |
| BR-003 | Prevent deletion of configuration required to interpret committed historical transactions. |
| BR-004 | Support versioning and effective dating of commercial rules. |
| BR-005 | Gate activation of incomplete commercial setup where checklists apply. |

---

## Functional Requirements

| ID | Requirement | Pack FR |
|----|-------------|---------|
| FR-001 | Support commercial-rule versioning. | FR-027 |
| FR-002 | Support controlled creation, modification, activation and retirement of commercial rules. | FR-036 |
| FR-003 | Material commercial configuration changes shall be auditable. | FR-037 |
| FR-004 | Prevent deletion of configuration required to interpret committed historical transactions. | FR-038 |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Active rules used by snapshots cannot be hard-deleted; retire/supersede only. |
| BRU-002 | Activation may require approval when materiality thresholds are met. |
| BRU-003 | Draft versions are not used in production resolution unless explicitly previewing a version pin. |
| BRU-004 | Every activation/retirement emits an audit event. |
| BRU-005 | Business isolation: users only govern rules within authorised `businessId`. |

---

## High-Level Process Flow

```
Create/Edit Draft Rule Version
        ↓
Validate (IP-09)
        ↓
Submit for approval (ENG-005) if material
        ↓
Activate with effective from
        ↓
Prior version retired / superseded
        ↓
Audit trail recorded (ENG-013)
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Materiality thresholds | What requires approval |
| Approval roles | Maker-checker matrix |
| Checklist templates | ENG-003l commercial readiness |
| Retention | Minimum retain-for-history policy |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| IP-01–IP-05 | Governed objects |
| IP-06 / IP-09 | Version pins and validation gates |
| ENG-005 | Approvals |
| ENG-013 | Audit |
| ENG-003l | Setup completion |
| BP-001 | Admin roles / permissions |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Pending commercial approvals | Workflow queue |
| Rule version inventory | Active/draft/retired |
| Audit extract | Material changes by actor/date |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Material change requires configured approval before activation. |
| AC-002 | Hard delete blocked when rule version is referenced by snapshot/history. |
| AC-003 | Audit records actor, before/after, version and timestamp. |
| AC-004 | Resolution can pin/evaluate a specific rule version for reproducibility. |

---

## Document Control

| Item | Value |
|------|-------|
| Status | Draft — awaiting approval |
| Related FRs | FR-027, FR-036–FR-038 |
