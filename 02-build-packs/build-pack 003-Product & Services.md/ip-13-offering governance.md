BP-003 IP-013 – Offering Governance
Objective

Provide governance over the entire offering catalogue by controlling ownership, approvals, lifecycle governance, versioning, policy compliance, and stewardship.

Business Objectives
ID	Requirement
BR-001	Ensure every offering has a responsible owner.
BR-002	Prevent unauthorized changes.
BR-003	Support controlled versioning.
BR-004	Ensure regulatory compliance before activation.
BR-005	Improve catalogue quality.
BR-006	Support enterprise governance processes.
Functional Requirements
FR	Requirement
FR-001	Assign Responsible Business Owner.
FR-002	Assign Technical Owner.
FR-003	Assign Product Steward.
FR-004	Track ownership history.
FR-005	Support version history.
FR-006	Validate mandatory governance requirements.
FR-007	Display governance dashboard.
FR-008	Display governance score.
FR-009	Lock offerings under governance.
FR-010	Track approval readiness.
Governance Areas
Area	Examples
Ownership	Business Owner, Steward
Documentation	Complete, Missing
Compliance	Required documents present
Lifecycle	Draft, Active, Archived
Classification	Complete
Pricing	Available
Relationships	Valid
Analytics	Enabled
Governance Score

A calculated readiness score.

Example:

Offering Governance

Identity              ✔

Pricing               ✔

Classification        ✔

Documents             ✔

Compliance            ✔

Relationships         ✔

Analytics             ✔

Readiness

97%

Ready for Release
Readiness Checklist

Examples:

✔ Classification assigned

✔ Pricing configured

✔ Mandatory documents uploaded

✔ Required regulatory identifiers complete

✔ Responsible Business Owner assigned

✔ Lifecycle completed

✔ Required relationships defined

✔ Analytics enabled

This checklist should reuse the same UX pattern you've already implemented for onboarding and document compliance.

> **Architecture (AV-1.5):** The Readiness Checklist must be powered by **ENG-003l Checklist & Completion Engine** — metadata-driven, not hardcoded. Governance score weights and mandatory items are configured per industry/edition; BP-003 IP-013 consumes ENG-003l and displays results in the Governance tab.

Business Rules
Rule	Description
Every offering must have one Responsible Business Owner.	
Archived offerings cannot change governance.	
Readiness score is read-only.	
Governance checks run automatically.	
Failed governance blocks activation.	
Database
offering_governance

Stores

Offering
Business Owner
Technical Owner
Steward
Governance Status
Readiness Score
Notes
offering_governance_history

Immutable history of governance changes.

UI

New Workspace Tab

Governance

Sections

Ownership
Governance Score
Readiness Checklist
Validation Results
Governance History
Search

Support

Business Owner
Governance Status
Readiness
Missing Requirements
Timeline

Events

Governance Updated
Owner Changed
Steward Changed
Readiness Updated
Governance Approved
Audit

Track

Owner changes
Governance status
Readiness changes
Future Integration

This IP feeds:

Workflow Engine (ENG-005)
Audit Engine (ENG-013)
Reporting Engine (ENG-011)
Product Intelligence (IP-015)
Why IP-013 now?

Your current progression is:

IP-001 Foundation
IP-002 Classification
IP-003 Units
IP-004 Attributes
IP-005 Variants
IP-006 Bundles
IP-007 Digital Catalogue
IP-008 Lifecycle
IP-009 Documents
IP-010 Relationships
IP-011 Pricing
IP-012 Analytics

The only thing missing before you can confidently say an offering is "enterprise-ready" is Governance. Once governance is in place, you have a complete operational master.

> **Architecture (AV-1.5):** IP-014 (Roadmap & Release) is **retired from BP-003** → **ENG-003m Portfolio & Roadmap Engine**. IP-015 (Product Intelligence) is **deferred** → **ENG-003f / BP-013**. **BP-003 delivery ends at IP-013.**

CURSOR PROMPT
You are implementing BP-003 IP-013 – Offering Governance.

IMPORTANT

This is IP-013 ONLY.

DO NOT implement

- Workflow approvals
- AI recommendations
- Product Roadmap (retired → ENG-003m)
- Product Intelligence (deferred → ENG-003f / BP-013)
- Release Management
- Pricing
- Lifecycle
- Documents
- Analytics calculations

These are handled in other IPs.

Only implement Offering Governance.

====================================================
FOUNDATION
====================================================

Reuse completed IPs

IP-001 Product Foundation

IP-002 Classification

IP-003 Units of Measure

IP-004 Attributes

IP-005 Variants

IP-006 Bundles

IP-007 Digital Catalogue

IP-008 Lifecycle

IP-009 Documents & Compliance

IP-010 Relationships

IP-011 Pricing

IP-012 Analytics

Reuse engines

ENG-003a Configuration Engine

ENG-003b Localization & Regulatory Engine

ENG-004 Rules Engine

ENG-005 Workflow Engine (readiness only, NO workflow implementation)

ENG-013 Audit Engine

ENG-016 Search Engine

Product Timeline Engine

====================================================
OBJECTIVE
====================================================

Provide enterprise governance over Offerings.

The module must ensure

Ownership

Stewardship

Readiness

Governance validation

Governance history

without implementing approval workflows.

====================================================
DATABASE
====================================================

Create migration

0038_bp003_ip013_offering_governance.sql

Create table

offering_governance

Fields

id

business_id

offering_id

responsible_business_owner_party_id

technical_owner_party_id

product_steward_party_id

governance_status

readiness_score

last_validation_date

notes

metadata

created_at

updated_at

deleted_at

----------------------------------------------------

Create table

offering_governance_history

Fields

id

business_id

offering_governance_id

change_type

old_value

new_value

changed_by

change_date

metadata

====================================================
GOVERNANCE STATUS
====================================================

Seed configurable statuses

NOT_STARTED

IN_PROGRESS

READY

ON_HOLD

NON_COMPLIANT

ARCHIVED

====================================================
BUSINESS RULES
====================================================

Every offering must have

Responsible Business Owner

Governance history is immutable.

Readiness score is system calculated.

Archived offerings cannot modify governance.

Governance validations are read-only.

====================================================
READINESS CHECKLIST
====================================================

Reuse the checklist UX implemented for onboarding and document compliance.

Display

✔ Identity complete

✔ Classification assigned

✔ Pricing configured

✔ Required documents uploaded

✔ Compliance requirements met

✔ Relationships configured

✔ Analytics enabled

✔ Responsible Business Owner assigned

✔ Lifecycle complete

Each checklist item must display

Completed

Incomplete

Warning

The checklist must support future extension.

====================================================
READINESS SCORE
====================================================

Display

0–100%

Based on completed checklist items.

Do NOT implement AI scoring.

Use deterministic rules.

====================================================
MODULE LAYER
====================================================

Create

repositories

offering-governance-repository.ts

offering-governance-history-repository.ts

validators

offering-governance-validators.ts

services

offering-governance-service.ts

offering-governance-rules.ts

actions

offering-governance-actions.ts

====================================================
UI
====================================================

Enable Product Workspace tab

Governance

====================================================
GOVERNANCE TAB
====================================================

Sections

Ownership

Governance Status

Readiness Score

Readiness Checklist

Validation Results

Governance History

====================================================
OWNERSHIP
====================================================

Display

Responsible Business Owner

Technical Owner

Product Steward

Allow changing owners.

Track history.

====================================================
SEARCH
====================================================

Use PlatformSearchState.

Searching

No Results

Retry

Error

Support search by

Business Owner

Governance Status

Readiness

Offering

====================================================
TIMELINE
====================================================

Publish

Governance Updated

Owner Changed

Steward Changed

Readiness Updated

Validation Executed

====================================================
AUDIT
====================================================

Track

Owner changes

Governance status

Readiness changes

Validation execution

====================================================
DOCUMENTATION
====================================================

Update

Build Pack 003 Scope

IP-013 document

Platform Module Catalogue

Document that

Offering Governance prepares an offering for controlled release.

Workflow approvals are implemented separately by ENG-005.

====================================================
SMOKE TEST
====================================================

Create

bp003-ip013-offering-governance-smoke-validation.ts

Validate

Owner assignment

Governance status

Readiness calculation

Checklist rendering

History

Timeline

Audit

====================================================
QUALITY GATES
====================================================

Must pass

TypeScript

ESLint

Production Build

Smoke Validation

====================================================
OUTPUT
====================================================

When complete provide ONLY

1. Files Created

2. Files Modified

3. Database Schema

4. Business Rules

5. Architecture

6. UI Components

7. Manual Verification

8. Quality Gates

9. Future Enhancements

Stop after IP-013.

**DO NOT implement IP-014** — retired from BP-003 (AV-1.5); roadmap and release planning is owned by **ENG-003m Portfolio & Roadmap Engine**. **DO NOT implement IP-015** in BP-003 — deferred to ENG-003f / BP-013.
One architectural recommendation

I would make the Readiness Checklist metadata-driven via **ENG-003l Checklist & Completion Engine**, not hardcoded in IP-013 code.

Instead of embedding checks like "Pricing configured" or "Documents uploaded" in code, store them in a configurable table (or leverage ENG-003a Configuration Engine) with fields such as:

Check	Source Module	Mandatory	Weight
Classification assigned	BP-003 IP-002	Yes	10
Pricing configured	BP-003 IP-011	Yes	20
Documents uploaded	BP-003 IP-009	Yes	20
Relationships configured	BP-003 IP-010	No	10

Then the readiness score is calculated from configuration rather than code. This gives you the flexibility to have different governance requirements for different industries (e.g., a bank's loan product can require far more checks than a simple retail service) without changing the application. This approach is consistent with your vision of a configurable digitalization platform.