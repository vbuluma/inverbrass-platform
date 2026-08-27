BP-003 IP-010 – Offering Relationships

This IP defines how offerings relate to one another. It is different from Bundles (IP-006), because it captures business relationships, not packaging.

Objective

Provide configurable relationships between offerings to support cross-selling, dependencies, compatibility, upgrades, replacements, alternatives, and business rules.

Business Objectives
ID	Requirement
BR-001	Allow one offering to be related to many other offerings.
BR-002	Support configurable relationship types.
BR-003	Enable industry-specific relationships.
BR-004	Support dependency validation before offering activation or sale.
BR-005	Improve customer recommendations and cross-selling.
Functional Requirements
FR	Requirement
FR-001	Create offering relationships.
FR-002	Edit relationships.
FR-003	Remove relationships.
FR-004	Search related offerings.
FR-005	Display relationship graph.
FR-006	Filter by relationship type.
FR-007	Prevent duplicate relationships.
FR-008	Support effective and expiry dates.
FR-009	Support bidirectional or one-way relationships.
FR-010	Show related offerings inside Product Workspace.
Relationship Types

These must be configurable via ENG-003b.

Examples:

Relationship	Meaning
Parent Of	Hierarchical ownership
Child Of	Reverse hierarchy
Depends On	Cannot exist without another offering
Required With	Must be sold together
Optional With	Recommended companion
Alternative To	Customer may choose either
Upgrade To	New version
Downgrade To	Lower version
Replaces	Successor offering
Replaced By	Previous offering
Compatible With	Can work together
Incompatible With	Cannot coexist
Cross Sell	Suggested additional offering
Upsell	Higher-tier offering
Accessory	Supporting offering
Industry Examples
Banking
Savings Account → Requires KYC Package
Mortgage → Depends on Property Valuation
Credit Card Gold → Upgrade To Platinum
Mobile Loan → Cross Sell Insurance
Insurance
Motor Insurance → Requires Vehicle Inspection
Medical Cover → Optional Dental Cover
Healthcare
Consultation → Cross Sell Laboratory Test
Surgery → Depends On Theatre Booking
Education
Mathematics → Prerequisite for Advanced Mathematics
Degree → Upgrade To Masters
Hospitality
Room → Cross Sell Breakfast
Conference Package → Optional Catering
Business Rules
Rule	Description
One offering can have unlimited relationships.	
Duplicate relationships are not allowed.	
Circular dependencies are prevented.	
Inactive offerings cannot become mandatory dependencies.	
Expired relationships are ignored.	
Relationship rules participate in validation.	
Database

New tables

offering_relationship_type

Configurable catalogue

offering_relationship

Stores

Source Offering
Target Offering
Relationship Type
Effective Date
Expiry Date
Status
Metadata
UI

Product Workspace

New tab

Relationships

Sections

Required Offerings
Optional Offerings
Cross Sell
Upgrade Paths
Alternatives
Compatibility
Search

Support

Offering
Relationship Type
Status
Direction
Timeline

Events

Relationship Created
Relationship Updated
Relationship Removed
Audit

Track

Create
Update
Delete
Future Integration

This IP becomes a foundation for:

AI recommendations (ENG-012)
Recommendation Engine
Cross-selling
Upselling
Intelligent product catalogues
Product dependency validation
Customer journey recommendations
Why IP-010 before Pricing?



The first ten IPs establish the complete structure of an offering. Pricing is then applied to a well-defined product model, making it easier to support complex scenarios like relationship-based pricing, bundle discounts, and dependency rules.

CURSOR PROMPT

You are implementing BP-003 IP-010 – Offering Relationships.

IMPORTANT

This is IP-010 ONLY.

DO NOT implement:

- Pricing
- Discounts
- Recommendation Engine
- AI Suggestions
- Product Intelligence
- Workflow logic
- Product Bundles (already completed in IP-006)

Only implement Offering Relationships.

====================================================
FOUNDATION
====================================================

Reuse existing completed modules

IP-001 Product Foundation

IP-002 Classification

IP-003 Units of Measure

IP-004 Attributes

IP-005 Variants

IP-006 Bundles

IP-007 Digital Catalogue

IP-008 Lifecycle

IP-009 Documents & Compliance

Reuse platform engines

ENG-003b Localization & Regulatory Engine

ENG-013 Audit Engine

Product Timeline Engine

ENG-016 Search Engine

====================================================
OBJECTIVE
====================================================

Provide configurable relationships between Offerings.

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

Future offerings

This IP manages business relationships.

It does NOT manage pricing or bundles.

====================================================
DATABASE
====================================================

Create migration

0035_bp003_ip010_offering_relationships.sql

Create table

offering_relationship_type

Fields

id

business_id

code

name

description

is_bidirectional

is_active

sort_order

metadata

----------------------------------------------------

Create table

offering_relationship

Fields

id

business_id

source_offering_id

target_offering_id

relationship_type_id

effective_from

effective_to

status

notes

metadata

created_at

updated_at

deleted_at

====================================================
RELATIONSHIP TYPES
====================================================

Seed configurable relationship types.

Do NOT hardcode in application logic.

Examples

PARENT_OF

CHILD_OF

DEPENDS_ON

REQUIRED_WITH

OPTIONAL_WITH

ALTERNATIVE_TO

UPGRADE_TO

DOWNGRADE_TO

REPLACES

REPLACED_BY

COMPATIBLE_WITH

INCOMPATIBLE_WITH

CROSS_SELL

UPSELL

ACCESSORY

====================================================
BUSINESS RULES
====================================================

Unlimited relationships per offering.

Duplicate relationships are not allowed.

Circular dependencies are prevented.

Inactive offerings cannot become mandatory dependencies.

Expired relationships are ignored.

Relationship types are configurable.

Some relationship types are bidirectional.

Examples

COMPATIBLE_WITH

ALTERNATIVE_TO

Others are directional.

Examples

DEPENDS_ON

UPGRADE_TO

REPLACES

====================================================
MODULE LAYER
====================================================

Create

repositories

offering-relationship-repository.ts

offering-relationship-type-repository.ts

validators

offering-relationship-validators.ts

services

offering-relationship-service.ts

offering-relationship-rules.ts

actions

offering-relationship-actions.ts

====================================================
UI
====================================================

Enable Product Workspace tab

Relationships

====================================================
RELATIONSHIPS TAB
====================================================

Sections

Required Offerings

Optional Offerings

Cross Sell

Upgrade Path

Alternative Offerings

Compatibility

Dependencies

Buttons

Add Relationship

Edit

Remove

View Offering

Search

Filters

====================================================
SEARCH
====================================================

Use PlatformSearchState

Searching

No Results

Retry

Error

Support search by

Offering

Relationship Type

Status

====================================================
TIMELINE
====================================================

Publish events

Relationship Created

Relationship Updated

Relationship Removed

====================================================
AUDIT
====================================================

Track

Create

Update

Delete

====================================================
VALIDATION
====================================================

Prevent

Duplicate relationships

Circular references

Relationship to self

Invalid relationship type

====================================================
DOCUMENTATION
====================================================

Update

Build Pack 003 Scope

IP-010 document

Platform Module Catalogue

====================================================
SMOKE TEST
====================================================

Create

bp003-ip010-offering-relationships-smoke-validation.ts

Validate

Create relationship

Edit relationship

Delete relationship

Duplicate prevention

Circular dependency prevention

Timeline events

Audit entries

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

Stop after IP-010.

DO NOT begin IP-011.
One architectural refinement

I would also have Cursor implement the relationships as a generic platform capability rather than a product-specific one. In other words, internally use entity_type and entity_id (or offering_type and offering_id) instead of assuming everything is a product.

That way, the same engine can later support:

Party ↔ Party relationships (already in BP-002)
Product ↔ Product relationships (this IP)
Property ↔ Property relationships
Student ↔ Course relationships
Patient ↔ Medical Service relationships

without redesigning the schema. This keeps the engine aligned with your long-term vision of a configurable enterprise digitalization platform.