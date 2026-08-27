# BP-004 IP-08 – Communication Management

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-08 |
| Build Pack | BP-004 – Customer Relationship Management |
| Priority | High |
| Depends On | IP-04, IP-05, BP-002 IP-03, BP-002 IP-12 |

---

## Objective

Log and manage CRM customer communications—email, phone, SMS, WhatsApp, and in-person interactions—as an interaction history linked to CRM entities while respecting BP-002 contact channels and consent preferences.

---

## Business Problem

Customer communication history is scattered across inboxes, phone systems, and messaging apps. Service and sales staff repeat questions, violate consent preferences, and lack context on prior interactions. CRM must log communications centrally without reimplementing contact storage or consent management owned by BP-002.

---

## Scope

### Included

- Communication log entry (inbound and outbound)
- Channel type: email, phone, SMS, WhatsApp, letter, in-person
- Direction, timestamp, subject, summary
- Linkage to CRM record, account, contact, lead, opportunity, case
- Template reference for outbound messages
- Consent check before outbound (BP-002)
- Communication thread grouping
- Customer notifications

### Excluded

- Email/SMS gateway implementation (platform ENG-009)
- Contact phone/email storage (BP-002 IP-03)
- Consent registration and preference management (BP-002 IP-12)
- Marketing bulk send (IP-11 / future BP)

---

## Business Requirements

| ID | Requirement |
|----|-------------|
| BR-001 | Maintain complete interaction history per customer. |
| BR-002 | Enforce consent before outbound communication. |
| BR-003 | Support multiple channels with consistent logging model. |
| BR-004 | Associate communications with relevant CRM entities. |
| BR-005 | Enable supervisors to review communication quality and volume. |

---

## Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-001 | Log communication manually with channel, direction, summary, datetime. |
| FR-002 | Receive automated log entries from integrated channels (ENG-009). |
| FR-003 | Link communication to contact via BP-002 reference. |
| FR-004 | Check BP-002 consent before initiating outbound communication. |
| FR-005 | Block or warn when consent denied for channel. |
| FR-006 | Group related communications into threads. |
| FR-007 | Attach reference to template used for outbound messages. |
| FR-008 | Display communication history on CRM workspace and account. |
| FR-009 | Search communications by contact, channel, date, entity. |
| FR-010 | Publish communication events to BP-002 timeline and audit. |

---

## Business Rules

| ID | Rule |
|----|------|
| BRU-001 | Outbound communication requires valid BP-002 contact channel. |
| BRU-002 | Consent denial blocks outbound on that channel unless exempted by regulation config. |
| BRU-003 | Communication logs are append-only; corrections via addendum entry. |
| BRU-004 | Every log must reference at least one contact or lead identity. |
| BRU-005 | Sensitive content flags restrict visibility by role. |

---

## High-Level Process Flow

```
Initiate or Receive Communication
      ↓
Consent Check (outbound, BP-002)
      ↓
Send / Record via Channel (ENG-009)
      ↓
Log Entry Created + Entity Links
      ↓
Timeline Updated
      ↓
Optional Follow-up Activity (IP-05)
```

---

## Configuration Requirements

| Area | Configuration |
|------|---------------|
| Channel types | Enabled per business |
| Consent exemptions | Regulatory overrides (ENG-003b) |
| Message templates | ENG-009 template catalogue |
| Retention policy | Communication log retention |
| Visibility rules | Role-based sensitive content |

---

## Integration Requirements

| System | Integration |
|--------|-------------|
| BP-002 IP-03 | Contact channels |
| BP-002 IP-12 | Consent verification |
| BP-002 IP-10 | Timeline |
| ENG-009 | Send and delivery status |
| IP-05 | Follow-up task creation |
| IP-09 | Case communication thread |
| ENG-015 | Attachment storage |

---

## Reporting Requirements

| Report | Description |
|--------|-------------|
| Communication volume | By channel, direction, period |
| Response time | Inbound to first outbound |
| Consent blocks | Attempted sends blocked |
| Contact engagement | Communications per contact |

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Manual and automated communication logging operational. |
| AC-002 | Consent check blocks or warns per configuration. |
| AC-003 | History visible on CRM workspace entities. |
| AC-004 | Thread grouping displays related messages. |
| AC-005 | Timeline receives communication events. |

---

## Customer 360 Contribution

| Contribution | Description |
|--------------|-------------|
| **Widgets** | Last interaction channel, recent communication count |
| **Insights** | Last interaction date/time and channel |
| **Timeline** | `COMMUNICATION_SENT`, `COMMUNICATION_RECEIVED` |

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| BP-002 IP-03, IP-12 | Channels and consent |
| ENG-009 | Message delivery |
| IP-04, IP-05 | Customer context and follow-up |
