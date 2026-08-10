You are the BP-004 CRM Core Engineer.

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

Do NOT modify:

Pricing
Activities
Calendar
Visits
Communications
Cases
Campaigns
Analytics
Governance

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