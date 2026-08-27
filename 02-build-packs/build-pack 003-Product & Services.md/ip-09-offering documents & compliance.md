BP-003 IP-009 – Offering Documents & Compliance
Section	Requirement
IP ID	IP-009
Name	Offering Documents & Compliance
Objective	Manage all supporting documents, regulatory evidence, compliance requirements, document verification, expiry monitoring, and document lifecycle for every Offering.
Primary Engine	ENG-015 Document Engine
Supporting Engines	ENG-015a Document & Compliance Engine, ENG-003b Localization & Regulatory Engine, ENG-005 Workflow Engine, ENG-013 Audit Engine, ENG-009 Notification Engine
Business Objectives
ID	Requirement
BR-001	Allow every Offering to have unlimited supporting documents.
BR-002	Support mandatory and optional documents.
BR-003	Support configurable document requirements by country, industry, and product classification.
BR-004	Maintain document version history.
BR-005	Prevent publication of offerings with missing mandatory documentation.
BR-006	Track document expiry and verification.
BR-007	Support regulatory evidence without duplicating uploaded files.
Functional Requirements
FR ID	Requirement
FR-001	Upload supporting documents.
FR-002	Preview documents inside the application.
FR-003	Download documents.
FR-004	Replace document while maintaining version history.
FR-005	Delete documents (subject to permissions).
FR-006	Record document metadata.
FR-007	Search documents.
FR-008	Filter documents by type, status, expiry, verification.
FR-009	Link one document to multiple offerings where applicable.
FR-010	Display compliance status.
FR-011	Display missing mandatory documents.
FR-012	Display expired documents.
FR-013	Display document verification history.
FR-014	Maintain document timeline.
Supported Document Types

Document Types must not be hardcoded.

They come from ENG-003b.

Examples include:

Category	Examples
Legal	Terms & Conditions, Contracts, Agreements
Marketing	Product Brochure, Catalogue, Flyer
Regulatory	CBK Approval, Insurance Approval, Medical Licence
Technical	User Manual, Installation Guide
Financial	Tariff Guide, Pricing Schedule
Safety	Safety Certificate, SDS
Education	Curriculum, Accreditation
Healthcare	Drug Insert, Clinical Guideline
Warranty	Warranty Certificate
Other	Any configured type
Document Metadata

Every uploaded document stores:

Field
Document Type
Document Name
Description
Document Number
Issuing Authority
Country
Issue Date
Expiry Date
Verification Status
Verification Method
Version
Uploaded By
Upload Date
File Size
File Format
Storage Reference
Verification Status
Status
Pending
Verified
Rejected
Expired
Not Required
Compliance Requirements

Requirements come from ENG-003b.

Example

Classification	Mandatory Documents
Loan Product	Terms, Tariff Guide, CBK Approval
Insurance Policy	Policy Wording, IRA Approval
Drug	Pharmacy Licence, Drug Insert
Course	Accreditation Certificate
Compliance Status

Every Offering displays

Field
Compliance Score
Compliance Status
Mandatory Documents
Uploaded Documents
Missing Documents
Expired Documents
Verified Documents

Status

Complete
Incomplete
Expired
Pending Verification
Business Rules
Rule ID	Rule
BR-101	Unlimited documents per offering.
BR-102	Unlimited versions per document.
BR-103	Only latest version is Active.
BR-104	Missing mandatory documents reduce compliance score.
BR-105	Expired documents reduce compliance score.
BR-106	Archived offerings are read-only.
BR-107	Deleted documents remain in audit history.
BR-108	Verification requires appropriate permissions.
BR-109	Required document types come from ENG-003b.
BR-110	One document may support multiple offerings if linked by the Document Engine.
Workflow

Where configured

Upload

↓

Pending Verification

↓

Verified

↓

Compliance Updated

Uses Workflow Engine only when verification approval is required.

Notifications

Examples

Document Expiring Soon
Document Expired
Document Verified
Document Rejected
Missing Mandatory Document
Timeline

Events

Uploaded
Replaced
Verified
Rejected
Downloaded
Expired
Deleted
Audit

Track

Upload
Download
Replace
Delete
Verification
Metadata Changes
UI
Documents Tab

Features

Upload
Preview
Download
Replace
Delete
Search
Filters
Version History
Compliance Tab

Displays

Compliance %
Status
Missing Documents
Expired Documents
Required Documents
Verification Summary
Search

Support

Document Name
Type
Number
Status
Date
Uploaded By

Use the standard Platform Search UX:

Searching
No Results
Error
Retry
Integration
Engine	Purpose
ENG-015	Document Storage
ENG-015a	Compliance Evaluation
ENG-003b	Regulatory Requirements
ENG-005	Verification Workflow
ENG-009	Notifications
ENG-013	Audit
Product Timeline	Activity Feed
Dependencies

Requires

IP-001 Product Foundation
IP-002 Classification
IP-003 Units
IP-004 Attributes
IP-005 Variants
IP-006 Bundles
IP-007 Digital Catalogue
IP-008 Lifecycle
Recommendation before implementation

One refinement I'd make is to reuse the Party Document & Compliance implementation instead of creating another document module.

Architecturally, the platform should have:

One Document Engine (ENG-015) that stores and versions documents.
One Document & Compliance Engine (ENG-015a) that evaluates compliance.
Module-specific screens (Party Documents, Offering Documents, Property Documents, Student Documents, etc.) that are simply different views over the same engine.

That gives you a single enterprise document capability that every future vertical can consume, which aligns well with your platform vision

CURSOR PROMPT
You are implementing BP-003 IP-009 – Offering Documents & Compliance.

IMPORTANT

This is IP-009 ONLY.

DO NOT implement:

- OCR
- AI document extraction
- Digital signatures
- External regulator APIs
- Document storage engine
- Compliance engine

Those already exist.

Reuse them.

====================================================
ARCHITECTURE
====================================================

This IP MUST consume existing engines.

Reuse

ENG-015 Document Engine

ENG-015a Document & Compliance Engine

ENG-003b Localization & Regulatory Engine

ENG-005 Workflow Engine

ENG-009 Notification Engine

ENG-013 Audit Engine

Product Timeline Engine

DO NOT duplicate any functionality already implemented in these engines.

====================================================
OBJECTIVE
====================================================

Provide complete document and compliance management for every Offering.

Offerings include

Products

Services

Variants

Bundles

Subscriptions

Loan Products

Insurance Products

Offerings

Medical Services

Any future offering.

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

====================================================
REUSE DOCUMENT ENGINE
====================================================

Do NOT create

product_document

product_document_version

or any duplicate storage tables.

Instead

extend existing ENG-015 entities by linking documents to Offerings.

If linking tables are needed,

create only

offering_document_link

Fields

id

business_id

offering_id

offering_type

document_id

is_primary

effective_from

effective_to

created_at

updated_at

====================================================
REUSE COMPLIANCE ENGINE
====================================================

Compliance evaluation must call

ENG-015a

Do NOT calculate compliance independently.

ENG-015a returns

Compliance %

Status

Missing Documents

Expired Documents

Verification Summary

Display these.

====================================================
LOCALIZATION
====================================================

Required document types

must come from

ENG-003b

Never hardcode

Terms

Brochure

CBK Approval

Insurance Approval

etc.

Those are configuration data.

====================================================
FUNCTIONAL REQUIREMENTS
====================================================

Allow

Upload document

Preview

Replace

Download

Delete

Version history

Search

Filter

Support

Mandatory

Optional

Verified

Rejected

Expired

Pending

====================================================
UI
====================================================

Product Workspace

Add two tabs

Documents

Compliance

====================================================
DOCUMENTS TAB
====================================================

Display

Document Type

Name

Status

Version

Uploaded By

Issue Date

Expiry Date

Actions

Upload

Preview

Replace

Download

Delete

Version History

Preview MUST use

PlatformDocumentPreview

inside the application.

Never open browser tabs.

====================================================
COMPLIANCE TAB
====================================================

Display

Compliance %

Status

Required Documents

Uploaded Documents

Missing Documents

Expired Documents

Verification Summary

Colour coding

Green

Amber

Red

====================================================
BUSINESS RULES
====================================================

Unlimited documents

Unlimited versions

Only latest version active

Missing mandatory documents reduce compliance

Expired documents reduce compliance

Archived offerings are read-only

Deleted documents remain in audit

Verification permissions respected

====================================================
TIMELINE
====================================================

Publish events

Document Uploaded

Document Replaced

Document Deleted

Document Verified

Document Rejected

Compliance Updated

Document Expired

====================================================
AUDIT
====================================================

Track

Uploads

Downloads

Preview

Replacement

Deletion

Verification

Metadata updates

====================================================
SEARCH
====================================================

Use PlatformSearchState

Searching

No Results

Retry

Error

====================================================
WORKFLOW
====================================================

If document verification requires approval

submit to ENG-005.

Do not implement workflow logic.

====================================================
NOTIFICATIONS
====================================================

Publish notification events only.

Examples

Document expiring

Document expired

Compliance incomplete

Document verified

====================================================
DASHBOARD
====================================================

Add summary cards

Total Documents

Verified

Pending

Expired

Compliance %

====================================================
DOCUMENTATION
====================================================

Update

BP-003 Scope

IP-009 document

Platform Module Catalogue

Mention clearly

IP-009 consumes ENG-015 and ENG-015a.

====================================================
SMOKE TEST
====================================================

Create

bp003-ip009-offering-documents-smoke-validation.ts

Validate

Upload

Preview

Replace

Delete

Version History

Compliance display

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

3. Architecture Changes

4. Business Rules

5. UI Components

6. Manual Verification

7. Quality Gates

8. Future Enhancements

Stop after IP-009.

Do NOT begin IP-010.
One addition I recommend

I would add a "Document Matrix" within the Compliance tab. Instead of just listing uploaded documents, present a checklist that immediately shows what is required versus what has been provided:

> **Architecture (AV-1.5):** The document matrix is a **checklist instance** rendered by ENG-003l. Document matching and verification state comes from **ENG-015a Document & Compliance**; checklist definitions, progress, and blocking rules are owned by **ENG-003l** — not embedded in the Document Engine or BP-003 module code.

Required Document	Mandatory	Uploaded	Verified	Expires	Status
Terms & Conditions	✓	✓	✓	N/A	🟢 Complete
Product Brochure	✗	✓	✓	N/A	🟢 Complete
Regulatory Approval	✓	✗	—	—	🔴 Missing
Safety Certificate	✓	✓	✗	31-Dec-2026	🟡 Pending Verification

This gives operations, compliance teams, and auditors an immediate view of product readiness and is much more valuable than a simple document list. It also reinforces your goal of building an enterprise-grade digitalization platform.