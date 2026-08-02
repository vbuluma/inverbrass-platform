# Build Pack 004 – Customer Relationship Management (CRM)

## Objective

Develop a configurable, enterprise-grade Customer Relationship Management (CRM) capability that enables organizations to manage customer acquisition, engagement, communication, visits, opportunities, quotations, customer service, campaigns, and customer analytics through a single platform while leveraging reusable Platform Engines.

---

## Scope

BP-004 delivers end-to-end CRM capabilities covering:

**Customer 360 (IP-01 — single pane of glass)**
- Default landing page for every customer profile (Individual and Entity)
- Aggregates identity, relationships, business summary, insights, and unified timeline
- Reads BP-002 Party, relationships, documents, consent, and timeline without duplication
- IP-02–IP-12 contribute widgets and timeline events; future Build Packs register widgets

**Customer Acquisition**
- Lead capture, qualification, assignment, and conversion

**Sales Pipeline**
- Opportunities, sales stages, win/loss tracking, revenue forecasting

**Customer Management**
- Customer accounts, contacts, hierarchies, and relationships

**Activity Management**
- Tasks, calls, emails, follow-ups, and reminders

**Calendar & Appointment Management**
- Personal and team calendars, customer appointments, resource booking, reminders

**Customer Visit & Call Report Management**
- Visit planning, participants, collaborative call reports, meeting minutes, action items, supporting documents, review and approval workflow, visit analytics

**Communication Management**
- Email, SMS, WhatsApp, customer notifications, communication history

**Case & Complaint Management**
- Service requests, complaints, escalations, resolution tracking

**Quotations & Sales Pipeline**
- Quotation generation, approval, version control, customer acceptance

**Campaign Management**
- Marketing campaigns, target lists, campaign responses, campaign effectiveness

**CRM Analytics**
- Sales, pipeline, engagement, visit, and productivity analytics

**Governance**
- Audit, workflow, security, permissions, SLA integration, notifications, escalations

**Work Assignment & SLA (Platform — IP-01 consumption contract)**
- Assignment tracking and ownership history across users, teams, branches, and queues
- Per-assignee elapsed time, cumulative processing time, and total lifecycle duration
- Active, waiting, paused, and breached SLA measurement
- Queue management and work-duration analytics consumed by all CRM entity IPs

---

## Implementation Package Structure

| IP | Module |
|----|--------|
| IP-01 | CRM Foundation & Customer 360 |
| IP-02 | Lead Management |
| IP-03 | Opportunity Management |
| IP-04 | Customer & Contact Management |
| IP-05 | Activity & Task Management |
| IP-06 | Calendar & Appointment Management |
| IP-07 | Customer Visit & Call Report Management |
| IP-08 | Communication Management |
| IP-09 | Case & Complaint Management |
| IP-10 | Quotations & Sales Pipeline |
| IP-11 | Campaign Management |
| IP-12 | CRM Analytics & Dashboards |
| IP-13 | CRM Governance & Administration |

---

## IP Summaries

| IP | Purpose | Depends On |
|----|---------|------------|
| IP-01 | CRM master record, **Customer 360 hub** (default profile landing), lifecycle, single Party ID, ownership, **Work Assignment & SLA consumption contract** | BP-001, BP-002, ENG-003n, ENG-005 |
| IP-02 | Lead capture, qualification, assignment, conversion — **feeds Customer 360** | IP-01, BP-002, ENG-003n |
| IP-03 | Opportunity pipeline, stages, forecast, win/loss — **feeds Customer 360** | IP-01, IP-04, BP-003, ENG-003n |
| IP-04 | Customer accounts, hierarchies, contact roles — **feeds Relationship Network on 360** | IP-01, BP-002 |
| IP-05 | Activities, tasks, follow-ups — **feeds Customer 360 widgets and timeline** | IP-01, IP-04, BP-002 |
| IP-06 | Appointments, calendars, reminders — **feeds Customer 360** | IP-04, IP-05 |
| IP-07 | Visit planning, collaborative call reports — **feeds Customer 360** | IP-01, IP-04, IP-05, IP-06, ENG-003n, ENG-005 |
| IP-08 | Communication log, channels — **feeds Customer 360** | IP-04, IP-05, BP-002 |
| IP-09 | Cases, complaints, SLA — **feeds Customer 360** | IP-01, IP-04, IP-05, IP-08, ENG-003n |
| IP-10 | Quotations — **feeds Customer 360** | IP-03, BP-003 |
| IP-11 | Campaigns, responses — **feeds Customer 360** | IP-02, IP-08, BP-002 |
| IP-12 | Dashboards, KPIs, **customer-scoped Analytics tab and health score for 360** | IP-01–IP-11, ENG-003n, ENG-011 |
| IP-13 | Governance, readiness, merge, SLA admin, administration | IP-01–IP-12, ENG-003l, ENG-003n, ENG-005 |

---

## Dependencies

**Consumes**
- BP-001 – Business Setup & Onboarding
- BP-002 – Party & Relationship Management
- BP-003 – Product & Service Management

**Platform engines**
- ENG-003 Configuration
- ENG-003k Industry Experience
- ENG-003l Checklist & Completion
- **ENG-003n Work Assignment & SLA Engine**
- ENG-005 Workflow Engine *(approvals, escalations; complements ENG-003n)*
- ENG-009 Notifications
- ENG-011 Reporting
- ENG-013 Audit
- ENG-015 Document Management
- ENG-016 Search

> **Architecture note:** ENG-004 remains the **Rules Engine** (eligibility, scoring, decision tables). Work Assignment & SLA is a distinct capability registered as **ENG-003n** under the AV-1.5 extension pattern (AV-1.6).

---

## Out of Scope

The following belong to other Build Packs or future phases:

| Area | Owner |
|------|-------|
| Order fulfilment, deliveries, service fulfilment | BP-006+ |
| Billing, invoicing, receivables | BP-007+ |
| Full marketing automation | Future BP |
| Party identity, addresses, documents | BP-002 |
| Product catalogue and pricing rules | BP-003 |

---

## Architecture Boundary

| Build Pack | Responsibility |
|------------|----------------|
| BP-002 | Who the person or organisation is (Party) |
| BP-003 | What is offered (Offerings) |
| BP-004 | How we build and manage customer relationships — **Customer 360 is the primary experience** (IP-01) |
| BP-005+ | How we sell and fulfil (Sales, Orders, Billing) |

BP-004 deliberately stops before operational fulfilment and billing. IP-10 covers quotations and pipeline linkage; order execution remains downstream.

---

## Deliverables (per IP)

Each implementation package shall deliver:

- Database migration
- Repository layer
- Service layer
- Validators
- Server Actions
- UI components
- Workspace integration (**Customer 360 widget/timeline contribution** where applicable)
- Audit integration
- Timeline integration
- Search integration
- Smoke validation
- Documentation updates
- Implementation handover

---

## Quality Gates

Each IP shall satisfy:

- TypeScript compilation passes
- ESLint passes with zero errors
- Production build succeeds
- Smoke validation passes
- Architecture compliance verified
- Documentation updated
- Implementation handover approved

---

## IP Documentation Index

| Document |
|----------|
| [IP-01 CRM Foundation & Customer 360](./IP-01%20CRM%20Foundation%20%26%20Customer%20360.md) |
| [IP-02 Lead Management](./IP-02%20Lead%20Management.md) |
| [IP-03 Opportunity Management](./IP-03%20Opportunity%20Management.md) |
| [IP-04 Customer & Contact Management](./IP-04%20Customer%20%26%20Contact%20Management.md) |
| [IP-05 Activity & Task Management](./IP-05%20Activity%20%26%20Task%20Management.md) |
| [IP-06 Calendar & Appointment Management](./IP-06%20Calendar%20%26%20Appointment%20Management.md) |
| [IP-07 Customer Visit & Call Report Management](./IP-07%20Customer%20Visit%20%26%20Call%20Report%20Management.md) |
| [IP-08 Communication Management](./IP-08%20Communication%20Management.md) |
| [IP-09 Case & Complaint Management](./IP-09%20Case%20%26%20Complaint%20Management.md) |
| [IP-10 Quotations & Sales Pipeline](./IP-10%20Quotations%20%26%20Sales%20Pipeline.md) |
| [IP-11 Campaign Management](./IP-11%20Campaign%20Management.md) |
| [IP-12 CRM Analytics & Dashboards](./IP-12%20CRM%20Analytics%20%26%20Dashboards.md) |
| [IP-13 CRM Governance & Administration](./IP-13%20CRM%20Governance%20%26%20Administration.md) |
