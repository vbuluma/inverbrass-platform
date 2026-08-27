# BP-004 IP-07 – Customer Visit & Call Report Management

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-07 |
| Build Pack | BP-004 – Customer Relationship Management |
| Priority | High |
| Depends On | IP-01, IP-04, IP-05, IP-06, ENG-003n, ENG-005 |

---

## Objective

Enable structured planning, execution, and documentation of customer visits and call reports—including multi-participant collaboration, meeting minutes, action items, supporting documents, review and approval workflow, SLA-driven report turnaround, and visit analytics—linked to CRM accounts, contacts, opportunities, cases, and campaigns.

---

## Business Problem

Field sales and relationship teams conduct customer visits and calls daily, but outcomes are captured inconsistently in email or personal notes. When each participant writes a separate report, information fragments. Management lacks visibility into visit frequency, agreed actions, approval turnaround, and SLA compliance on call report submission. A governed, collaborative visit and call report capability ensures every customer interaction produces one consolidated record with traceable minutes, accountable action items, and measurable analytics.

---

## Scope

### Included — Visit Planning

- Schedule visit: physical, virtual, phone call, follow-up, relationship, complaint, sales, technical, inspection
- Visit title, customer, date, time, duration, location, GPS (optional)
- Meeting type, objectives, agenda, priority
- Links to opportunity, case, campaign, quotation, service request, contract
- Optional linkage to IP-06 appointment (scheduling remains IP-06; visit documentation is IP-07)

### Included — Participants

- **Internal participants:** multiple staff on one visit record (collaborative, not duplicate reports)
- **Customer attendees:** name, position, email, mobile, organisation, present flag, optional signature

### Included — Collaborative Call Report

- Structured sections: agenda, discussion, decisions, risks, next steps
- Per-participant contributions consolidated into one report (collaborative editing)
- Meeting minutes and deliberation summary

### Included — Action Items

- Assign owner, due date, priority, status, progress
- Each owner tagged and able to act on assigned items
- Optional handoff to IP-05 tasks on approval

### Included — Documents & Sign-off

- Attach photos, signed minutes, quotations, presentations, PDFs, voice notes, videos, business cards (ENG-015)
- Optional customer sign-off: digital signature, PIN, photo confirmation, GPS confirmation

### Included — Review & Approval

- Submit → Supervisor review → Manager review → Approved / Returned / Rejected
- Reviewer actions: approve, return, reject, request clarification
- Notifications via ENG-009 to participants, reviewer, supervisor, customer owner

### Included — SLA Integration

- Call report due SLA after visit completion (e.g. report due within 24 hours)
- Reminders and escalation via ENG-003n + ENG-005
- Per-reviewer assignment segments for approval turnaround analytics

### Included — Analytics

- Visits per employee/customer, outcomes, open action items, report turnaround, approval turnaround, follow-up completion, visit frequency, engagement indicators

### Excluded

- Calendar views, availability, and resource booking (IP-06)
- Generic activity/task lists without visit context (IP-05)
- Communication transport (IP-08)
- Field service dispatch and routing (operational BP)
- GPS route optimisation (future enhancement)

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Document every significant customer visit or call with one collaborative structured report. |
| BR-002 | Capture internal and customer attendees on a single visit record. |
| BR-003 | Record meeting minutes and agreed outcomes in structured sections. |
| BR-004 | Generate action items assignable to CRM users with due dates and status tracking. |
| BR-005 | Support supervisor/manager review and approval before report finalisation. |
| BR-006 | Attach supporting documents and optional customer sign-off evidence. |
| BR-007 | Enforce call report submission SLA with reminders and escalation. |
| BR-008 | Provide visit analytics for management oversight (IP-12). |
| BR-009 | Reuse platform engines: ENG-003n (SLA), ENG-005 (approval), ENG-009 (notify), ENG-003k (terminology), ENG-013 (audit), ENG-015 (documents). |

---

## Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-001 | Create visit/call report manually or from completed IP-06 appointment. |
| FR-002 | Link report to CRM record, account, contact, lead, opportunity, case, campaign, or quotation. |
| FR-003 | Capture visit metadata: type, date, time, duration, location, GPS, objectives, agenda, priority. |
| FR-004 | Add multiple internal participants; all contribute to one report. |
| FR-005 | Record customer attendees with presence and optional signature. |
| FR-006 | Author collaborative call report with section-level contributions by participant. |
| FR-007 | Create action items with owner, due date, priority, and status; owners receive assignments. |
| FR-008 | Attach supporting documents via ENG-015; preview in-app. |
| FR-009 | Submit report for review; route through ENG-005 approval workflow. |
| FR-010 | Approve, return, or reject with mandatory reviewer comments. |
| FR-011 | On approval, publish timeline event, close report SLA segment, optionally create IP-05 tasks. |
| FR-012 | Start call report due SLA on visit completion; remind and escalate per configuration. |
| FR-013 | Track approval SLA per reviewer using ENG-003n assignment segments. |
| FR-014 | Search and filter reports by account, owner, date, status, visit type, SLA status. |
| FR-015 | Expose visit metrics to IP-12: frequency, coverage, open actions, turnaround times. |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Approved reports are read-only except addendum notes by authorised users. |
| BRU-002 | Every report must link to at least one CRM entity. |
| BRU-003 | Action items must have an owner and due date when report is submitted; each owner can act only on assigned items. |
| BRU-004 | Rejected or returned reports return to author with mandatory revision notes. |
| BRU-005 | Customer attendees should reference BP-002 contacts where possible. |
| BRU-006 | Visit linked to appointment retains bidirectional reference with IP-06. |
| BRU-007 | One visit record per conducted engagement; participants collaborate—no duplicate visit records per participant. |
| BRU-008 | Call report SLA breach triggers escalation per ENG-003n/ENG-005 configuration. |

---

## High-Level Process Flow

```
Plan Visit (IP-06 Appointment optional)
      ↓
Conduct Visit / Call
      ↓
Visit Completed → Call Report SLA starts (ENG-003n)
      ↓
Collaborative Draft (participants contribute)
      ↓
Add Action Items + Documents
      ↓
Submit for Review → Reviewer assignment segment (ENG-003n)
      ↓
Approved? ──Yes──→ Finalise → Timeline + IP-12 Analytics
      │
      No → Revise → Resubmit
      ↓
Action tracked by each responsible people/SLA Reminder / Escalation if overdue
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Visit types | Sales, Site audit, Executive call, Complaint, Technical, Inspection, etc. |
| Report templates | Industry-specific minute structures (ENG-003k labels) |
| Approval workflow | By visit type or value threshold (ENG-005) |
| Call report due SLA | Hours after visit completion |
| Approval SLA | Per review stage |
| Mandatory fields | Per visit type |
| Action item defaults | Priority and due date offsets |
| Sign-off methods | Signature, PIN, photo, GPS |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| IP-01 | Work Assignment & SLA consumption contract |
| IP-04 | Account and contact context |
| IP-05 | Follow-up tasks from action items |
| IP-06 | Appointment linkage (scheduling only) |
| IP-12 | Visit and SLA analytics dashboards |
| BP-002 IP-10 | Timeline publication |
| ENG-003n | Report due SLA, reviewer segments, cumulative TAT |
| ENG-005 | Approval workflow and escalation |
| ENG-009 | Participant, reviewer, and SLA notifications |
| ENG-003k | Industry terminology |
| ENG-015 | Document attachments |
| ENG-013 | Audit trail |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Visit register | By account, owner, period |
| Visit frequency | Visits per account and rep |
| Action item tracker | Open vs completed actions by owner |
| Call report turnaround | Visit end to report submission |
| Approval turnaround | Submit to approve; per reviewer segment |
| SLA compliance | Report due and approval breaches |
| Coverage | Accounts without recent visits |
| Team productivity | Visits and outcomes by team |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Visit reports creatable with CRM entity linkage. |
| AC-002 | Multiple internal participants collaborate on one report. |
| AC-003 | Customer attendees and minutes recorded in structured sections. |
| AC-004 | Action items assignable; owners can update assigned items only. |
| AC-005 | Approval workflow enforced; return/reject requires comments. |
| AC-006 | Call report SLA reminders and escalations fire per configuration. |
| AC-007 | Per-reviewer and total approval duration available via ENG-003n. |
| AC-008 | Approved reports publish to timeline and IP-12 analytics. |
| AC-009 | Documents attachable and previewable in-app. |

---

## Customer 360 Contribution

| Contribution | Description |
|--------------|-------------|
| **Widgets** | Recent visits, open call-report action items, pending approvals |
| **Insights** | Last visit date, days since last visit, report approval status |
| **Timeline** | `VISIT_PLANNED`, `VISIT_COMPLETED`, `CALL_REPORT_SUBMITTED`, `CALL_REPORT_APPROVED` |

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| IP-01 | CRM Foundation & Customer 360; SLA contract |
| IP-04 | Customer and contact context |
| IP-05 | Task follow-up |
| IP-06 | Appointment source |
| ENG-003n | Assignment and SLA segments |
| ENG-005 | Approval and escalation |
| ENG-009 | Notifications |
| ENG-015 | Documents |

---

## Future Enhancements

- Reuse visit module for property inspections, school visits, patient outreach, donor monitoring, supplier audits (vertical configuration only).
- Offline capture with sync (mobile, Phase 2).
