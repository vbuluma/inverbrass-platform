# BP-004 IP-05 – Activity & Task Management

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-05 |
| Build Pack | BP-004 – Customer Relationship Management |
| Priority | High |
| Depends On | IP-01, IP-04, BP-002 IP-10, ENG-003n (optional) |

---

## Objective

Enable recording, assignment, and completion of CRM activities and tasks—calls, meetings, visits, emails, and follow-ups—linked to CRM entities and contributing to Party timeline history without duplicating BP-002 activity infrastructure.

---

## Business Problem

Customer engagement is invisible when interactions live in personal calendars and notebooks. Sales and service teams need shared task lists, overdue follow-up visibility, and a complete activity history on each customer, lead, opportunity, and case.

---

## Scope

### Included

- Activity types: call, meeting, visit, email, task, note
- Activity scheduling and due dates
- Assignment and delegation
- Completion status and outcomes
- Linkage to lead, CRM record, account, contact, opportunity, case
- Activity dashboard and overdue views
- Contribution to unified timeline

### Excluded

- Calendar resource booking (IP-06)
- Visit and call report detail (IP-07)
- Communication transport and logging detail (IP-08)
- Party timeline engine implementation (BP-002 IP-10)
- Project management workflows

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Capture all customer-facing work as traceable activities. |
| BR-002 | Assign activities to owners with due dates and priorities. |
| BR-003 | Surface overdue and upcoming activities per user and team. |
| BR-004 | Link activities to any CRM entity for context. |
| BR-005 | Feed activity events into customer timeline (BP-002 IP-10). |
| BR-006 | Optional: activity owner reassignment shall record assignment history via ENG-003n when SLA tracking is enabled. |

---

## Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-001 | Create activity with type, subject, description, due date, priority. |
| FR-002 | Assign activity to user or team; support reassignment with optional ENG-003n segment tracking. |
| FR-003 | Link activity to one or more CRM entities (lead, account, opportunity, etc.). |
| FR-004 | Mark activity complete with outcome and notes. |
| FR-005 | Cancel or defer activity with reason. |
| FR-006 | Display my activities, team activities, and overdue lists. |
| FR-007 | Auto-create follow-up task from lead, opportunity, or case rules. |
| FR-008 | Publish activity events to BP-002 timeline and ENG-013 audit. |
| FR-009 | Search activities by entity, owner, type, status, date range. |
| FR-010 | Support recurring task templates where configured. |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Completed activities are read-only except addendum notes. |
| BRU-002 | Every activity must link to at least one CRM or Party entity. |
| BRU-003 | Overdue activities trigger notification per ENG-009 rules. |
| BRU-004 | System-generated activities retain source reference. |
| BRU-005 | Activity owner must belong to business context. |

---

## High-Level Process Flow

```
Create Activity (manual or rule-triggered)
      ↓
Assign Owner + Due Date
      ↓
Notify Owner
      ↓
Execute (Call / Meet / Visit)
      ↓
Complete with Outcome
      ↓
Timeline Updated → Optional Follow-up Task
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Activity types | Per industry |
| Priority levels | Low, Normal, High, Urgent |
| Outcome codes | Per activity type |
| Auto-task rules | On lead assign, case open, stage change |
| Overdue thresholds | Notification timing |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| BP-002 IP-10 | Timeline publication |
| IP-02–IP-04, IP-09 | Entity linkage |
| ENG-003n | Optional activity owner SLA segments |
| IP-06 | Meeting may create appointment |
| IP-07 | Visit may spawn call report |
| IP-08 | Email activity may reference communication log |
| ENG-009 | Reminders and overdue alerts |
| ENG-016 | Activity search |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Activity volume | By type, owner, period |
| Completion rate | On-time vs overdue |
| Entity engagement | Activities per account or opportunity |
| Team workload | Open tasks by assignee |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Activities creatable and linkable to all CRM entity types. |
| AC-002 | Overdue and my-activities views accurate. |
| AC-003 | Completion publishes to timeline. |
| AC-004 | Auto-task rules generate activities on configured triggers. |
| AC-005 | Notifications sent per overdue configuration. |

---

## Customer 360 Contribution

| Contribution | Description |
|--------------|-------------|
| **Widgets** | Tasks due, overdue count, recent activity summary |
| **Insights** | Next follow-up date, overdue tasks |
| **Timeline** | `ACTIVITY_CREATED`, `ACTIVITY_COMPLETED`, `ACTIVITY_OVERDUE` via BP-002 Party Timeline |

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| IP-01, IP-04 | CRM context |
| BP-002 IP-10 | Timeline |
| ENG-009 | Notifications |
