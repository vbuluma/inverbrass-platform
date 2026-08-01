Build Pack 004 – Customer Relationship Management (CRM)
1. Purpose

Provide a complete, enterprise-grade Customer Relationship Management (CRM) capability that enables organizations to acquire, manage, engage, retain, and analyse customer relationships across all supported industry verticals.

The CRM shall be configurable, metadata-driven, industry-neutral, and reusable across Banking, Healthcare, Education, Property Management, Retail, NGOs, Hospitality, Manufacturing, Government, and SME solutions.

The CRM extends the Party Master (BP-002) by introducing the Customer Profile and customer engagement capabilities.

2. Objectives

The solution shall enable organizations to:

Manage customer profiles throughout their lifecycle.
Capture and qualify leads.
Track opportunities and sales pipelines.
Record customer interactions and activities.
Manage customer documents and compliance.
View a complete Customer 360° profile.
Analyse customer engagement and value.
Govern customer ownership and approvals.
Improve customer experience and retention.
3. Scope

BP-004 includes the following implementation packages.

IP	Name	Purpose
IP-001	Customer Profile Foundation	Customer master profile extending Party Master
IP-002	Customer Classification & Segmentation	Categories, segments, groups and customer hierarchies
IP-003	Customer Contacts	Contact persons, roles and communication preferences
IP-004	Customer Addresses	Physical, postal, billing, delivery and geolocation
IP-005	Customer Relationships	Parent-child, guarantors, branches, beneficiaries and organizational relationships
IP-006	Customer Documents & Compliance	KYC documents, contracts, licences and document tracking
IP-007	Lead Management	Lead capture, qualification, assignment and conversion
IP-008	Opportunity Management	Opportunity pipeline, probability, expected revenue and forecasting
IP-009	Customer Activities & Tasks	Calls, meetings, visits, reminders, follow-ups and appointments
IP-010	Customer Communications	Email, SMS, WhatsApp, phone calls, letters and interaction history
IP-011	Customer 360° Workspace	Unified customer workspace consolidating all customer information
IP-012	Customer Analytics & Performance	Lifetime value, engagement, churn indicators and customer KPIs
IP-013	Customer Governance	Ownership, approvals, merge, archive and readiness
IP-014	Customer Cases & Enquiries	Complaints, enquiries, feedback, service requests and escalations
IP-015	Customer Notes & Interaction Timeline	Chronological relationship history and customer notes
4. Key Functional Capabilities
Customer Foundation
Customer Profile
Customer Lifecycle
Customer Ownership
Customer Status
Customer Preferences
Customer Segmentation
Customer Acquisition
Lead Capture
Lead Qualification
Lead Assignment
Lead Conversion
Opportunity Pipeline
Customer Engagement
Activities
Tasks
Meetings
Calls
Visits
Appointments
Communication History
Notes
Customer Information
Contacts
Addresses
Documents
Relationships
Compliance
Customer Intelligence
Customer 360°
KPIs
Customer Value
Customer Behaviour
Customer Growth
Engagement
Churn Indicators
Governance
Ownership
Approval
Merge & Deduplication
Archive
Audit
Timeline
5. Dependencies

Consumes capabilities from:

BP-001 – Identity & Security
BP-002 – Party Management
BP-003 – Product & Service Management

Uses platform engines:

ENG-003 Configuration
ENG-003l Checklist & Completion
ENG-005 Workflow
ENG-011 Reporting
ENG-013 Audit
ENG-015 Document Management
ENG-016 Search
6. Out of Scope

The following belong to other Build Packs:

BP-005
Quotations
Proposal Management
Sales Orders
BP-006
Order Fulfilment
Deliveries
Service Fulfilment
BP-007
Billing
Invoicing
BP-008
Receivables
Collections
Marketing Automation (Future BP)
Campaigns
Email Marketing
Promotions
Loyalty Programmes
7. Deliverables

Each IP shall deliver:

Database migration
Repository layer
Service layer
Validators
Server Actions
UI components
Workspace integration
Audit integration
Timeline integration
Search integration
Smoke validation
Documentation updates
Implementation handover
8. Quality Gates

Each IP shall satisfy:

TypeScript compilation passes.
ESLint passes with zero errors.
Production build succeeds.
Smoke validation passes.
Architecture compliance verified.
Documentation updated.
Implementation handover approved.
Architecture Note

Unlike BP-003, which manages Offerings, BP-004 manages Customer Relationships. It deliberately stops before commercial transactions. The boundary between the build packs is:

BP-002: Who the person or organisation is (Party).
BP-003: What is offered (Offerings).
BP-004: How we build and manage relationships with customers (CRM).
BP-005: How we sell those offerings (Sales & Quotations).
BP-006: How we fulfil customer commitments (Orders & Fulfilment).

This separation keeps the platform modular, avoids overlap, and allows every vertical solution to reuse the same CRM foundation while implementing its own sales and operational processes.