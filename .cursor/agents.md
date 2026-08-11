You are working on InverBrass Platform, BP-004 Customer Relationship Management.

==================================================
BP-004 CRM CORE ENGINEER
==================================================
Branch:
bp004-crm-core
Ownership:
- IP-01 Customer Profile Foundation
- IP-02 Prospect & Lead Management
- IP-03 Opportunity & Pipeline Management
- IP-04 Account & Contact Management
Read ONLY:
02-build-packs/Build Pack 004 - Customer Relationship Management/
Follow:
agents.md
.cursor rules
Enterprise Architecture
Never modify CRM Core.
- Pricing
- Calendar
- Campaigns
- Analytics
- IPs owned by other BP-004 engineers
Implement only your owned IPs.
Customer 360 is part of IP-01.
Requirements:
- Single customer workspace
- Customer 360 tab
- Individual and Entity layouts
- Related parties
- Relationship navigation
- Unified timeline
- Health summary cards
- Prospect → Lead → Customer lifecycle
- No duplication during conversion
- Account hierarchies
- Contact roles
- Full metadata-driven configuration
- Audit
- Workflow
- Notifications
- Maker-checker where documented
Before each IP:
Run:
npm run lint
npm run typecheck
After each IP:
Run build.
Stop after each completed IP.
Never continue to another IP without explicit approval.
Do not modify SQL unless the documentation explicitly requires it.
Documentation updates should only occur if implementation requires them.

==================================================
BP-004 CUSTOMER SERVICE & ENGAGEMENT ENGINEER
==================================================
Branch:
bp004-service-engagement
Ownership:
- IP-05 Activity & Task Management
- IP-06 Calendar & Appointment Management
- IP-07 Visit & Call Report Management
- IP-08 Communication Management
- IP-09 Case & Service Request Management
- IP-13 CRM Governance & Administration
Read Build Pack 004 only.
Do not modify CRM Core.
Use existing engines:
- Workflow
- Notification
- Document
- Audit
- Reporting
- Organization
- Party
- User
- Authentication
Implement:
- Activities
- Tasks
- Appointments
- Visits
- Collaborative visit reports
- Attendees
- Approvals
- Supporting documents
- Communications
- Cases
- SLA
- TAT
- Escalations
- Notifications
- Governance
- Configuration
- Approval matrices
- Queues
- Assignment
- Business hours
- Holiday calendars
All SLA/TAT values must be configurable.
Automatic escalation when SLA breached.
Timers pause/resume where documented.
Before every IP:
Run:
npm run lint
npm run typecheck
After every IP:
Run build.
Stop after every IP.
Do not continue automatically.
Do not modify SQL unless documentation explicitly requires it.

==================================================
BP-004 SALES & MARKETING ENGINEER
==================================================
Branch:
bp004-sales-marketing
Ownership:
- IP-10 Quotations & Sales Proposals
- IP-11 Campaign & Marketing Management
- IP-12 CRM Analytics & Dashboards
Read ONLY:
Build Pack 004 documentation.
Assume:
Customer
Lead
Account
Opportunity
already exist.
Never modify CRM Core.
Implement:
Quotation workflow
Approval workflow
Campaign management
Campaign members
Marketing lists
Lead attribution
Conversion reporting
Dashboards
Pipeline analytics
Forecasting
Executive dashboards
Entity-aware terminology through ENG-003k.
Use existing engines:
Workflow
Notification
Reporting
Document
Audit
AI
Before every IP:
lint
typecheck
After every IP:
build
Stop after each completed IP.
Do not continue automatically.