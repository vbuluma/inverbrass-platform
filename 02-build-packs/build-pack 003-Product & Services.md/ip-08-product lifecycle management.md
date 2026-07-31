BP-003 IP-008 – Product Lifecycle Management
Objective

Manage the complete lifecycle of an offering from conception to retirement while ensuring governance, approval, auditability, and controlled publication.

Why IP-008 exists

IP-001 provided:

Status field
Draft
Active
Suspended
Archived

IP-008 provides:

Controlled transitions
Approval workflow
Effective dates
Retirement
Versioning
Lifecycle history
Publishing governance
Business Objectives

Support:

New Product Development
Product Approval
Product Activation
Product Suspension
Product Retirement
Product Replacement
Product Versioning
Core Capabilities
1. Lifecycle States

Supported states

Draft

Pending Approval

Approved

Active

Suspended

Deprecated

Discontinued

Archived

Notice we've expanded beyond the IP-001 foundation.

2. Lifecycle Transitions

Example

Draft
      ↓
Pending Approval
      ↓
Approved
      ↓
Active
      ↓
Suspended
      ↓
Active

or

Active
      ↓
Deprecated
      ↓
Discontinued
      ↓
Archived
3. Approval Workflow

Products requiring governance should use Workflow Engine.

Examples

New Loan Product

↓

Product Committee

↓

Compliance

↓

Risk

↓

Approved

↓

Active

4. Effective Dates

Support

Effective From

Effective To

Future activation.

Example

Launch product on

1 January

Automatically becomes Active.

5. Retirement

Support

Retired because

Replacement

Regulatory

Business decision

Merged

Expired

6. Product Replacement

Example

Savings Account V1

↓

Savings Account V2

Maintain relationship.

Future analytics remain intact.

7. Versioning

Support

V1

V2

V3

Minor revisions

Major revisions

Keep historical versions.

8. Lifecycle Policies

Examples

Cannot Archive if

Published

Cannot Delete if

Referenced

Cannot Activate if

Mandatory attributes missing

Cannot Publish if

Not approved

9. Scheduled Lifecycle

Support

Activate later

Suspend later

Archive later

Automatically.

10. Notifications

Notify

Business Owner

Compliance

Marketing

Operations

when lifecycle changes.

Uses Notification Engine.

Database
product_lifecycle

Stores lifecycle metadata.

Fields

product_id
current_state
previous_state
effective_from
effective_to
retirement_reason
replacement_product_id
approval_required
version_number
product_lifecycle_event

Stores

Every lifecycle change.

Business Rules

Cannot activate

without mandatory data.

Cannot archive

published products.

Cannot delete

active products.

Only one

Active version.

Replacement

must exist.

Workflow Integration

Uses

ENG-005 Workflow Engine.

Example

Create Product

↓

Submit for Approval

↓

Workflow

↓

Approved

↓

Activate
Timeline

Events

Created

Submitted

Approved

Activated

Suspended

Reactivated

Deprecated

Discontinued

Archived

Replaced

Audit

Track

Old State

New State

Approver

Reason

Comments

Effective Dates

UI
Lifecycle Dashboard

KPIs

Draft

Pending Approval

Active

Suspended

Deprecated

Archived

Lifecycle Panel
Current Status

Active

Effective From

1 Jan 2027

Effective To

—

Version

2.1

Replacement

None

Actions

Suspend

Archive

Replace

Submit for Approval
Lifecycle Timeline

Visual progression

Draft

↓

Approval

↓

Active

↓

Suspended

↓

Archived
Integration

Consumes

ENG-005 Workflow

ENG-009 Notifications

ENG-013 Audit

Product Timeline

Digital Catalogue

Future Vertical Examples
Banking

Loan Product

↓

Committee Approval

↓

Risk

↓

Compliance

↓

Launch

Healthcare

Procedure

↓

Medical Board Approval

↓

Publish

Education

Course

↓

Curriculum Approval

↓

Active

Insurance

Policy

↓

Regulatory Approval

↓

Market Release

Hospitality

Seasonal Package

↓

Scheduled Activation

↓

Auto Archive

Dependencies

Requires

IP-001 Product Foundation
IP-002 Classification
IP-003 Units
IP-004 Attributes
IP-005 Variants
IP-006 Bundles
IP-007 Digital Catalogue
My recommendation

I would not allow users to freely change lifecycle states from a dropdown anymore.

Instead:

Draft → Submit for Approval
Approved → Activate
Active → Suspend
Suspended → Reactivate
Active → Replace
Deprecated → Archive

Each action becomes an explicit business operation, governed by business rules and (where required) the Workflow Engine

CURSOR PROMPT
Below is a production-ready Cursor prompt for BP-003 IP-008 – Product Lifecycle Management.

You are implementing BP-003 IP-008 – Product Lifecycle Management.

IMPORTANT

This is IP-008 ONLY.

DO NOT implement:

- Pricing
- Inventory
- Orders
- Payments
- AI recommendations
- Marketplace integrations

Use the existing architecture exactly.

====================================================
FOUNDATION
====================================================

Reuse existing platform standards.

ENG-003f Product Intelligence Engine
ENG-005 Workflow Engine
ENG-009 Notification Engine
ENG-013 Audit Engine
ENG-016 Search Engine
Product Timeline Engine

Consume existing Product modules:

IP-001 Product Foundation
IP-002 Classification
IP-003 Units of Measure
IP-004 Attributes
IP-005 Variants
IP-006 Bundles
IP-007 Digital Catalogue

No duplication.

====================================================
OBJECTIVE
====================================================

Implement complete Product Lifecycle Management.

IP-001 introduced lifecycle status fields.

IP-008 implements:

Lifecycle governance

Lifecycle transitions

Versioning

Approval integration

Replacement

Retirement

Scheduling

Lifecycle history

====================================================
DATABASE
====================================================

Create migration

0033_bp003_ip008_product_lifecycle.sql

Create table

product_lifecycle

Fields

id

business_id

product_id

current_state

previous_state

effective_from

effective_to

approval_required

approval_status

retirement_reason

replacement_product_id

version_number

major_version

minor_version

metadata

created_at

updated_at

deleted_at

----------------------------------------------------

Create

product_lifecycle_event

Fields

id

product_id

event_type

old_state

new_state

reason

performed_by

performed_at

metadata

====================================================
LIFECYCLE STATES
====================================================

Supported states

DRAFT

PENDING_APPROVAL

APPROVED

ACTIVE

SUSPENDED

DEPRECATED

DISCONTINUED

ARCHIVED

====================================================
BUSINESS RULES
====================================================

Only one ACTIVE version.

Draft products

may be edited.

Approved products

may not be edited directly.

Create new version instead.

Archived products

read-only.

Inactive products

cannot be published.

Published products

cannot be archived.

Replacement product

must exist.

Replacement product

cannot reference itself.

No circular replacement chains.

Effective From

must be before

Effective To.

====================================================
LIFECYCLE TRANSITIONS
====================================================

Allowed transitions

Draft

↓

Pending Approval

↓

Approved

↓

Active

↓

Suspended

↓

Active

or

Active

↓

Deprecated

↓

Discontinued

↓

Archived

Reject invalid transitions.

====================================================
WORKFLOW
====================================================

Integrate with ENG-005.

If approval_required = true

Submit to Workflow Engine.

Do not build workflow logic.

Only integrate.

Workflow actions

Submit

Approve

Reject

Cancel

====================================================
VERSIONING
====================================================

Support

Major Version

Minor Version

Examples

1.0

1.1

1.2

2.0

Only one version may be Active.

====================================================
SCHEDULING
====================================================

Support

Activate Later

Suspend Later

Archive Later

Store schedule only.

No background jobs.

Future scheduler will consume.

====================================================
RETIREMENT
====================================================

Support reasons

Replacement

Regulatory

Business Decision

Expired

Merged

Other

====================================================
REPLACEMENT
====================================================

Support

Replacement Product

Example

Savings Account V1

↓

Savings Account V2

Display relationship.

====================================================
MODULE LAYER
====================================================

Create

repositories

product-lifecycle-repository.ts

product-lifecycle-event-repository.ts

validators

product-lifecycle-validators.ts

services

product-lifecycle-rules.ts

product-lifecycle-service.ts

actions

product-lifecycle-actions.ts

====================================================
UI
====================================================

Create

Lifecycle Dashboard

/products/lifecycle

Lifecycle Workspace Panel

inside Product Workspace

====================================================
LIFECYCLE DASHBOARD
====================================================

KPIs

Draft

Pending Approval

Approved

Active

Suspended

Deprecated

Archived

Recently Changed

====================================================
PRODUCT WORKSPACE
====================================================

Create new tab

Lifecycle

Display

Current State

Version

Effective Dates

Replacement

Approval Status

Retirement

Actions

Submit for Approval

Approve

Activate

Suspend

Reactivate

Deprecate

Archive

Create New Version

Replace Product

Buttons shown according to lifecycle rules.

====================================================
TIMELINE
====================================================

Events

Draft Created

Submitted

Approved

Rejected

Activated

Suspended

Reactivated

Deprecated

Discontinued

Archived

Version Created

Replacement Assigned

====================================================
AUDIT
====================================================

Track

State Changes

Version Changes

Replacement

Approvals

Schedule Changes

Reasons

====================================================
SEARCH
====================================================

Use PlatformSearchState

Searching

No Results

Retry

Error

====================================================
NOTIFICATIONS
====================================================

Integrate with ENG-009.

Publish notification events.

Do not build delivery.

Examples

Product Approved

Product Activated

Product Archived

====================================================
ROUTES
====================================================

Create

/products/lifecycle

Integrate Product Workspace

Lifecycle tab

====================================================
DOCUMENTATION
====================================================

Update

Build Pack 003 Scope

IP-008 document

Platform Module Catalogue

====================================================
SMOKE TEST
====================================================

Create

bp003-ip008-product-lifecycle-smoke-validation.ts

Validate

Lifecycle creation

State transitions

Approval submission

Version increment

Replacement

Retirement

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
DO NOT IMPLEMENT
====================================================

Workflow Engine

Notification delivery

Scheduler

Pricing

Inventory

Orders

Payments

AI

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

Stop after IP-008.

Do NOT begin IP-009.
One enhancement to include

Since you're building an enterprise platform, add a Lifecycle Policy section in the service layer that is configuration-driven instead of hard-coded. For example:

"Approval required before activation" (Yes/No)
"Allow direct activation" (Yes/No)
"Maximum active versions" (default = 1)
"Allow reactivation from suspended" (Yes/No)

These policies should ultimately come from your Configuration Engine (ENG-003a), allowing different industries (Banking, Healthcare, Education, etc.) to enforce different governance rules without changing code. This keeps the lifecycle engine generic while making its behavior configurable.