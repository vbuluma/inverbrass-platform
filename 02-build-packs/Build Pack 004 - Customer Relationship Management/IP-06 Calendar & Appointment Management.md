# BP-004 IP-06 – Calendar & Appointment Management

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-06 |
| Build Pack | BP-004 – Customer Relationship Management |
| Priority | Medium |
| Depends On | IP-04, IP-05 |

---

## Objective

Provide CRM calendar and appointment scheduling for customer meetings, site visits, and service appointments with participant management, reminders, and linkage to accounts, contacts, and opportunities.

---

## Business Problem

Scheduled customer interactions are disconnected from CRM records when kept in external calendars alone. Teams miss appointments, double-book resources, and lose context on who attended and what was agreed. CRM needs governed appointments tied to customer entities with reminder and outcome capture.

---

## Scope

### Included

- Appointment creation and scheduling
- Personal and team calendar views
- Internal and external participants (contacts via BP-002)
- Location, virtual meeting link, duration
- Appointment status: Scheduled, Completed, Cancelled, No-show
- Reminders and notifications
- Outcome capture linked to activity (IP-05)
- Optional Outlook/Google calendar integration hooks

### Excluded

- Visit planning, collaborative call reports, meeting minutes, and visit SLA (IP-07)
- Enterprise resource planning calendars
- Room and equipment booking (future module)
- Video conferencing platform implementation
- Full workforce scheduling
- Visit and call report authoring (IP-07)

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Schedule customer appointments within CRM context. |
| BR-002 | Invite internal staff and external contacts with visibility of status. |
| BR-003 | Send reminders before appointments. |
| BR-004 | Record completion, cancellation, or no-show outcomes. |
| BR-005 | Display team calendar for coordination. |
| BR-006 | Completed appointments may hand off to IP-07 for visit/call report documentation; scheduling remains in IP-06. |

---

## Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-001 | Create appointment with subject, start/end, location, type. |
| FR-002 | Link appointment to CRM record, account, contact, opportunity, or case. |
| FR-003 | Add internal participants (users) and external participants (BP-002 contacts). |
| FR-004 | Support virtual meeting URL and physical location. |
| FR-005 | Display personal and team calendar views. |
| FR-006 | Send reminder notifications via ENG-009. |
| FR-007 | Reschedule or cancel with reason and participant notification. |
| FR-008 | Mark completed and optionally create IP-05 activity with outcome. |
| FR-009 | Mark no-show with follow-up task suggestion. |
| FR-010 | Search appointments by date, participant, entity, status. |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | End time must be after start time. |
| BRU-002 | Cancelled appointments retain history; no hard delete. |
| BRU-003 | External participants must be BP-002 contacts or lead records. |
| BRU-004 | Completed appointments should link to a completed activity where configured. |
| BRU-005 | Users see only appointments they own or participate in unless manager role. |

---

## High-Level Process Flow

```
Schedule Appointment
      ↓
Add Participants + Link CRM Entity
      ↓
Send Invites / Reminders
      ↓
Held? ──Yes──→ Complete → Activity Outcome (IP-05) → Optional Call Report (IP-07)
      │
      No → Cancel / No-show → Follow-up Task
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Appointment types | Sales visit, Demo, Service call, etc. |
| Default duration | By appointment type |
| Reminder intervals | e.g. 24h, 1h before |
| Working hours | Business calendar defaults |
| Team visibility rules | Manager access |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| IP-05 | Activity on completion |
| IP-04 | External participants |
| IP-07 | Appointment may initiate visit/call report |
| BP-002 IP-10 | Timeline event |
| ENG-009 | Reminders and reschedule notifications |
| External calendars | Optional future sync |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Appointment schedule | By user, team, period |
| Completion rate | Held vs cancelled vs no-show |
| Customer meetings | Appointments per account |
| Utilisation | Appointments per sales rep |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Appointments schedulable with CRM entity linkage. |
| AC-002 | Calendar views display personal and team schedules. |
| AC-003 | Reminders sent per configuration. |
| AC-004 | Completion creates linked activity record. |
| AC-005 | Cancel and no-show captured with audit trail. |

---

## Customer 360 Contribution

| Contribution | Description |
|--------------|-------------|
| **Widgets** | Next appointment, upcoming meetings this week |
| **Insights** | Next scheduled visit/meeting datetime |
| **Timeline** | `APPOINTMENT_SCHEDULED`, `APPOINTMENT_COMPLETED`, `APPOINTMENT_CANCELLED` |

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| IP-05 | Activity linkage |
| IP-04 | Contact participants |
| ENG-009 | Notifications |
