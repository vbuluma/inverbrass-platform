
P-003 IP-004 – Product Attributes Engine
Objective

Provide a configurable metadata engine that defines the characteristics (attributes) of any product or service without changing the database schema.

The engine must support all industries while remaining reusable across future modules.

Functional Requirements
FR ID	Requirement
FR-001	Create Attribute Groups
FR-002	Create Attribute Definitions
FR-003	Configure Attribute Data Types
FR-004	Configure Validation Rules
FR-005	Configure Select Options
FR-006	Assign Attributes to Product Types
FR-007	Assign Attributes to Categories
FR-008	Configure Display Order
FR-009	Configure Mandatory vs Optional
FR-010	Configure Read-only attributes
FR-011	Configure Hidden attributes
FR-012	Archive attributes
FR-013	Search attributes
FR-014	Version attribute definitions
FR-015	Timeline
FR-016	Audit
Attribute Data Types

Must support:

Text
Long Text
Integer
Decimal
Currency
Percentage
Boolean
Date
DateTime
Email
Phone
URL
File
Image
JSON
Dropdown
Multi-select
Radio Button
Checkbox
Validation Rules

Each attribute can define:

Required
Unique
Minimum value
Maximum value
Minimum length
Maximum length
Regular expression
Default value

Example

Attribute

Interest Rate

Type

Decimal

Minimum

0

Maximum

100

Required

Yes

Precision

2 decimal places
Attribute Groups

Example

Retail

Inventory

Pricing

Tax

Specifications

Property

Property Details

Facilities

Utilities

Dimensions

Healthcare

Clinical

Consultation

Medication

Insurance

Policy

Coverage

Claims

Attribute Assignment

Attributes should never belong to every product.

Instead they are assigned.

Example

Laptop

RAM

Storage

CPU

Battery

Insurance Policy

Waiting Period

Cover Limit

Premium Frequency

Property

Bedrooms

Bathrooms

Parking

Floor Area

UI Requirements
Dashboard

Show

Total Attribute Groups
Total Attributes
Active
Archived
Recently Updated
Attribute Groups

CRUD

Example

Property Details

Specifications

Pricing

Attribute Definitions

CRUD

Example

Bedrooms

Code

BEDROOMS

Type

Integer

Required

Yes

Assignment Screen

Assign attributes to

Product Type

or

Category

Example

Property

✔ Bedrooms

✔ Bathrooms

✔ Parking

✔ Floor Area

Search

Search by

Name

Code

Group

Product Type

Status

Timeline

Events

Attribute Created

Attribute Updated

Attribute Assigned

Attribute Removed

Validation Changed

Option Added

Audit

Track

Old value

New value

Who

When

Reason

Business Rules
Rule	Description
BR-001	Attribute codes unique per business
BR-002	Attribute names unique within a group
BR-003	Attribute groups reusable
BR-004	Attribute assignments reusable
BR-005	Archived attributes cannot be assigned
BR-006	Existing products retain archived attributes
BR-007	Options only valid for Select/Multi-select
BR-008	Validation enforced before save
BR-009	Display order configurable
Non-Functional Requirements
Metadata-driven
Multi-business
Multi-industry
Version controlled
Soft delete
Timeline
Audit
Searchable
Extensible
No schema change required for new industries
What IP-004 should NOT do

To keep responsibilities clean, IP-004 should not:

Store product-specific attribute values.
Handle product variants.
Define pricing.
Define units of measure.
Define inventory.
Contain AI logic.

Those belong to other IPs.

One recommendation based on your platform vision

I would make one small but important change to the scope.

Instead of calling it Product Attributes Engine, call it the Metadata Definition Engine internally.

The first consumer is Products (BP-003), but later the same engine can define metadata for:

Parties (Customer attributes)
Properties
Assets
Vehicles
Employees
Students
Patients
Suppliers

This avoids building separate "attribute engines" later while still keeping BP-003 as the first implementation. It aligns with your goal of a configurable platform with specialized experiences built on shared core capabilities

Cusor prompt

BP-003 IP-004 — Product Attributes Engine

Read first (mandatory):

1. 02-build-packs/build-pack 003-Product & Services.md/build-pack -003 Scope.md
2. 02-build-packs/build-pack 003-Product & Services.md/ip-04-product attributes engine.md
3. 01-enterprise-architecture/02-Platform-Module-Catalog.md
4. 01-enterprise-architecture/06b-UX & Interaction Standards.md

This implementation MUST follow all platform architecture and UX standards already implemented.

----------------------------------------------------
OBJECTIVE
----------------------------------------------------

Implement a metadata-driven Product Attributes Engine.

The objective is to eliminate hardcoded product fields.

Instead of adding new database columns whenever a new industry needs additional product information, administrators configure attributes.

Examples:

Laptop

RAM
Storage
CPU
Operating System

Vehicle

Fuel Type
Transmission
Engine Capacity
Colour

Property

Bedrooms
Bathrooms
Parking
Floor
Plot Size

Medical Service

Duration
Consultant Required

Insurance

Waiting Period
Maximum Cover
Policy Type

Loan

Interest Type
Grace Period
Collateral Required

Future industries should configure new attributes without schema changes.

----------------------------------------------------
DATABASE
----------------------------------------------------

Create Drizzle schema and migration.

attribute_group

id
business_id
code
name
description
display_order
status
metadata
audit fields
soft delete
version

product_attribute_definition

id
business_id
attribute_group_id
code
name
description

data_type

TEXT
NUMBER
BOOLEAN
DATE
DATETIME
EMAIL
PHONE
URL
JSON
SELECT
MULTI_SELECT

validation_rule

required
min_value
max_value
min_length
max_length
regex

default_value

display_order

status

metadata

audit fields

soft delete

version

product_attribute_option

id
attribute_definition_id
option_code
option_label
display_order
status

product_attribute_assignment

id
business_id
product_id
attribute_definition_id
attribute_value

metadata

audit fields

----------------------------------------------------
BUSINESS RULES
----------------------------------------------------

Attribute code unique per business

Attribute groups reusable

Same attribute reusable across multiple products

Attributes can be mandatory

Attributes can be hidden

Attributes can be read-only

Archived attributes remain visible historically

Options belong only to SELECT/MULTI_SELECT

Validation occurs before save

----------------------------------------------------
SERVICE LAYER
----------------------------------------------------

Repositories

AttributeGroupRepository

AttributeDefinitionRepository

AttributeAssignmentRepository

AttributeOptionRepository

Services

AttributeDefinitionService

AttributeAssignmentService

AttributeValidationService

Rules

AttributeRules

----------------------------------------------------
DYNAMIC FORM ENGINE
----------------------------------------------------

Registration screen MUST NOT hardcode attributes.

Instead:

Load assigned attribute definitions

Render UI dynamically.

Examples

TEXT

Text input

NUMBER

Numeric field

BOOLEAN

Toggle

DATE

Date picker

SELECT

Dropdown

MULTI_SELECT

Checkbox list

This becomes the reusable Dynamic Attribute Renderer.

----------------------------------------------------
PRODUCT WORKSPACE
----------------------------------------------------

New tab

Attributes

Administrator can

Add attribute

Edit value

View validation

History

Search attributes

Group by attribute group

----------------------------------------------------
TIMELINE
----------------------------------------------------

Create events

ATTRIBUTE_ASSIGNED

ATTRIBUTE_UPDATED

ATTRIBUTE_REMOVED

ATTRIBUTE_OPTION_CHANGED

----------------------------------------------------
AUDIT
----------------------------------------------------

Track

Attribute values

Definition changes

Validation rule changes

Option changes

----------------------------------------------------
SEARCH
----------------------------------------------------

Products become searchable using attribute values.

Example

Search:

Bedrooms = 4

Returns properties.

Search

RAM = 16GB

Returns laptops.

----------------------------------------------------
UI
----------------------------------------------------

Create:

Attribute Dashboard

Attribute Group Management

Attribute Definition Management

Dynamic Attribute Panel

Use:

PlatformWorkspaceHeader

PlatformTabs

PlatformSearchState

PlatformActionResult

PlatformCompletionCard

StickyActionBar

EmptyState

----------------------------------------------------
INDUSTRY EXPERIENCE
----------------------------------------------------

Industry Experience (ENG-003k)

Only displays relevant attribute groups.

Property

Property Details

Banking

Loan Details

Healthcare

Clinical Details

Retail

Inventory Details

The engine remains generic.

----------------------------------------------------
QUALITY
----------------------------------------------------

Pass:

TypeScript

ESLint

Production Build

Create

scripts/bp003-ip004-product-attributes-smoke-validation.ts

----------------------------------------------------
DOCUMENTATION
----------------------------------------------------

Update:

IP-004 document

Build Pack scope

Architecture references

----------------------------------------------------
IMPORTANT

Do NOT start IP-005.

Stop after IP-004.

Return implementation handover in standard format:

1. Files Created

2. Files Modified

3. Database Schema

4. Business Rules

5. Architecture

6. UI Components

7. Manual Verification

8. Quality Gates

9. Future Integration

---

## Implementation Record — IP-004 (2026-08-01)

**Branch:** `feature/bp003-catalogue`  
**Migration:** `03-platform/drizzle/0032_bp003_ip004_product_attributes.sql`  
**Smoke script:** `03-platform/scripts/bp003-ip004-product-attributes-smoke-validation.ts`

### Delivered

- Metadata-driven attribute groups, definitions, options, scope assignments (product type / classification), and product value assignments
- Dynamic Attribute Renderer + Product Workspace **Attributes** tab
- Attribute admin dashboard at `/products/attributes`
- Enterprise audit + attribute timeline + product timeline events for value changes
- Industry Experience attribute group filtering (`attribute-group-filters.ts`)

### Integration handover (shared files — not edited per agent rules)

1. `03-platform/src/db/schema/index.ts` — export new schema modules
2. `03-platform/drizzle/meta/_journal.json` — register `0032_bp003_ip004_product_attributes`
3. Run migration against Supabase PostgreSQL before runtime use

### Quality gates

| Gate | Result |
|------|--------|
| ESLint | Pass (0 errors; pre-existing warnings in other IPs) |
| Production build | Pass |
| Smoke validation | 51/52 pass (journal registration pending integration) |
