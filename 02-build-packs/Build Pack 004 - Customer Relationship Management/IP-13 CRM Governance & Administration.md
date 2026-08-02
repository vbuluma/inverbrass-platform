# BP-004 IP-13 – CRM Governance & Administration

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-13 |
| Build Pack | BP-004 – Customer Relationship Management |
| Priority | High |
| Depends On | IP-01 through IP-12, ENG-003l, ENG-005 |

---

## Objective

Provide enterprise governance and administration over CRM data quality, ownership, approvals, merge and deduplication, readiness scoring, security, permissions, and stewardship—mirroring the BP-003 Offering Governance pattern for CRM entities.

---

## Business Problem

CRM databases degrade without ownership accountability, duplicate records, and ungoverned status changes. Enterprise deployments require readiness checks before customer activation, controlled merge of duplicates, role-based administration, and audit-ready stewardship comparable to product catalogue governance in BP-003 IP-13.

---

## Scope

### Included

- CRM ownership model (owner, relationship manager, steward)
- Governance readiness checklist (ENG-003l)
- Governance score per CRM record
- Duplicate detection and merge proposal workflow
- Approval gates for status and merge actions
- CRM administration: roles, permissions, configuration access
- Archive and data quality rules
- Governance dashboard and missing-requirements views
- Governance history
- SLA policy administration for CRM entity types (ENG-003n; consumed by IP-02, IP-03, IP-07, IP-09)

### Excluded

- Party merge mechanics (BP-002)
- Product/offering governance (BP-003 IP-13)
- Master data management hub (future)
- Platform identity administration (BP-001)

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Every active CRM record has assigned ownership. |
| BR-002 | Readiness checklist blocks activation where configured. |
| BR-003 | Duplicate CRM records detected and mergeable via approval. |
| BR-004 | Governance changes are audited and historically traceable. |
| BR-005 | Stewards can assess data quality across the CRM portfolio. |
| BR-006 | CRM administration settings are role-governed and auditable. |
| BR-007 | SLA policy definitions for CRM entity types shall be administrable without code changes where possible (ENG-003n). |

---

## Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-001 | Assign customer owner, relationship manager, and optional steward. |
| FR-002 | Track ownership history with effective dates. |
| FR-003 | Run readiness checklist (ENG-003l) on CRM record activation. |
| FR-004 | Calculate governance score from checklist completion weights. |
| FR-005 | Block or warn on activation when mandatory items incomplete. |
| FR-006 | Detect potential duplicate CRM records (same Party, similar identity). |
| FR-007 | Propose merge with survivor selection and field resolution rules. |
| FR-008 | Execute merge via ENG-005 approval workflow. |
| FR-009 | Display governance tab on CRM workspace: score, checklist, history. |
| FR-010 | Provide governance dashboard: missing owners, low scores, duplicates. |
| FR-011 | Administer CRM module permissions and configuration access by role. |
| FR-012 | Administer SLA policies per entity type (lead, opportunity, case, visit report) via ENG-003n configuration. |
| FR-013 | Lock governed records from edit during pending approval. |
| FR-014 | Publish governance events to timeline and audit. |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Active CRM record requires assigned owner. |
| BRU-002 | Governance score is calculated; not manually editable. |
| BRU-003 | Failed readiness blocks activation per configuration. |
| BRU-004 | Merge retires duplicate CRM record; preserves history on survivor. |
| BRU-005 | Party merge remains BP-002 scope; CRM merge links Party references only. |
| BRU-006 | Archived records cannot change governance assignments. |
| BRU-007 | Merge approval requires authorized steward or admin role. |
| BRU-008 | CRM administration changes require elevated permission and audit. |

---

## High-Level Process Flow

```
CRM Record Created
      ↓
Assign Owner → Run Readiness Checklist
      ↓
Score ≥ Threshold? ──No──→ Remediation items
      │
     Yes
      ↓
Activate
      ↓
Ongoing: Duplicate Detection → Merge Proposal → Approval → Merge
      ↓
Governance Dashboard monitors portfolio health
      ↓
Administration: Roles, permissions, CRM configuration
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Readiness checklist items | ENG-003l per industry |
| Score weights | Mandatory vs optional items |
| Activation threshold | Minimum score percentage |
| Duplicate match rules | Party match, fuzzy name |
| Merge approval workflow | ENG-005 |
| Steward and admin roles | Permission mapping |
| CRM module permissions | Role matrix |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| IP-01 | CRM master governance |
| IP-09 | SLA governance alignment |
| ENG-003n | SLA policy administration |
| ENG-005 | Merge and activation approvals |
| ENG-013 | Governance audit |
| BP-002 | Party reference integrity on merge |
| BP-003 IP-13 | Pattern alignment; no overlap |
| ENG-011 | Governance dashboard reports |
| BP-001 | Platform security and roles |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Governance score distribution | Portfolio readiness |
| Missing requirements | Records below threshold |
| Ownership gaps | Records without owner |
| Duplicate queue | Pending merge proposals |
| Merge history | Completed merges with audit |
| Administration audit | Permission and config changes |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Readiness checklist runs on activation attempt. |
| AC-002 | Governance score reflects checklist state accurately. |
| AC-003 | Activation blocked when mandatory items fail. |
| AC-004 | Duplicate detection surfaces merge candidates. |
| AC-005 | Approved merge consolidates records with full audit trail. |
| AC-006 | Governance dashboard identifies portfolio gaps. |
| AC-007 | CRM administration actions are permission-gated and audited. |

---

## Customer 360 Contribution

| Contribution | Description |
|--------------|-------------|
| **Settings tab** | Customer Profile Settings tab (role-gated): merge rules, SLA policies, governance actions |
| **Not on 360 hub** | Governance admin does not duplicate Customer 360 widgets |

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| IP-01 | CRM Foundation & Customer 360 |
| ENG-003l | Checklist |
| ENG-003n | SLA policy administration |
| ENG-005 | Approvals |
| ENG-013 | Audit |
| BP-002 | Party integrity |
| BP-001 | Security and roles |

---

> **Pattern alignment:** This IP follows the same governance model as BP-003 IP-13 (Offering Governance), adapted for CRM entities and consuming ENG-003l rather than hardcoded checklists.
