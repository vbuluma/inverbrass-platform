# BP-004 IP-09 – Case & Complaint Management

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-09 |
| Build Pack | BP-004 – Customer Relationship Management |
| Priority | High |
| Depends On | IP-01, IP-04, IP-05, IP-08, ENG-003n |

---

## Objective

Manage customer service cases—including enquiries, complaints, feedback, and service requests—with categorization, prioritization, SLA tracking, escalation, and resolution linked to CRM accounts and contacts.

---

## Business Problem

Customer issues arrive through phone, email, walk-in, and web channels without unified tracking. Response times slip, escalations are informal, and resolution knowledge is lost. A governed case management layer on CRM foundation ensures accountability and measurable service quality.

---

## Scope

### Included

- Case registration and case number
- Case types: enquiry, complaint, feedback, service request
- Priority and severity
- Case assignment and escalation
- SLA timers and breach alerts
- Case status lifecycle
- Resolution codes and customer satisfaction capture
- Case workspace and queue views

### Excluded

- IT helpdesk asset management
- Field service dispatch and routing (operational BP)
- Knowledge base authoring (future)
- Billing disputes (finance BP)

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Register and track all customer service interactions as cases. |
| BR-002 | Meet SLA targets by priority and case type. |
| BR-003 | Escalate overdue or high-severity cases automatically. |
| BR-004 | Link cases to account, contact, and CRM record for full context. |
| BR-005 | Capture resolution and optional customer satisfaction. |
| BR-006 | Support industry-specific case types and SLAs. |
| BR-007 | Measure SLA per assignee and cumulatively across all handlers until resolution (ENG-003n). |

---

## Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-001 | Create case manually, from communication (IP-08), or API. |
| FR-002 | Generate configurable case number. |
| FR-003 | Classify case type, category, priority, and severity. |
| FR-004 | Link case to CRM record, account, and primary contact. |
| FR-005 | Assign case owner and support queue; record assignment history via IP-01 / ENG-003n. |
| FR-006 | Track status: New, Open, Pending Customer, Escalated, Resolved, Closed. |
| FR-007 | Start and monitor SLA clocks per priority; track per-assignee segments and total case SLA via ENG-003n. |
| FR-008 | Escalate on SLA breach or manual trigger with notification. |
| FR-009 | Record resolution summary, code, and root cause. |
| FR-010 | Capture optional satisfaction rating on close. |
| FR-011 | Reopen closed cases via governed workflow. |
| FR-012 | Display agent queue, my cases, and overdue SLA views. |
| FR-013 | Publish case events to timeline and audit. |
| FR-014 | Display current owner elapsed time, prior owners' cumulative time, total case duration, SLA remaining, and breach status. |
| FR-015 | Pause SLA clock in Pending Customer and other configured wait states. |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Case number unique within business. |
| BRU-002 | Closed cases are read-only except governed reopen. |
| BRU-003 | SLA breach triggers escalation per configuration. |
| BRU-004 | Resolution requires summary and resolution code. |
| BRU-005 | Escalated cases notify configured supervisor role. |
| BRU-006 | High-severity cases may require immediate owner assignment. |
| BRU-007 | Case reassignment stops current assignee SLA segment and starts a new segment (ENG-003n). |
| BRU-008 | Total case SLA equals cumulative handler time excluding configured pause periods. |

---

## High-Level Process Flow

```
Case Opened (channel / manual)
      ↓
Classify + Assign + SLA Start (ENG-003n segment)
      ↓
Work Case (Activities, Communications)
      ↓
Pending Customer? ──→ Resume on response
      ↓
Resolve → Satisfaction (optional)
      ↓
Close
      ↓
Escalate at any stage if SLA breached
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Case types and categories | Per industry |
| Priority and severity matrix | SLA mapping |
| SLA targets | Response and resolution times |
| Escalation paths | Role and queue routing |
| Resolution and root cause codes | Metadata lists |
| Queue definitions | Team assignment |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| IP-01 | Customer context; assignment/SLA contract |
| ENG-003n | Per-handler and total case SLA |
| IP-05 | Case activities |
| IP-08 | Communication thread |
| ENG-005 | Escalation and reopen approval |
| ENG-009 | SLA breach and assignment notifications |
| ENG-011 | Service dashboards |
| BP-002 IP-10 | Timeline |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Case volume | By type, channel, period |
| SLA compliance | Met vs breached; by owner and cumulative |
| Handler duration | Time per assignee before escalation or reassignment |
| Resolution time | Average by priority and type |
| Escalation rate | By team and category |
| Satisfaction | Scores and trends |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Cases creatable with full classification and linkage. |
| AC-002 | SLA timers accurate and breach triggers escalation. |
| AC-003 | Queue views show assigned and unassigned work. |
| AC-004 | Resolution and close require configured fields. |
| AC-005 | Case history visible on account and CRM workspace. |
| AC-006 | Per-assignee and total SLA durations visible; reassignment history immutable. |

---

## Customer 360 Contribution

| Contribution | Description |
|--------------|-------------|
| **Widgets** | Open cases, escalated cases, last complaint |
| **Insights** | Cases overdue, SLA breach flags, last case resolution |
| **Timeline** | `CASE_OPENED`, `CASE_ESCALATED`, `CASE_RESOLVED` |

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| IP-01 | Assignment/SLA contract |
| IP-04, IP-05 | Context |
| IP-08 | Engagement |
| ENG-003n | SLA segments and queue metrics |
| ENG-005, ENG-009 | Workflow and alerts |
| ENG-011 | Reporting |
