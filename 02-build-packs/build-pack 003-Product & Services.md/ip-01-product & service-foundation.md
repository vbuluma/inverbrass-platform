BP-003 IP-001 – Product & Service Foundation

> **Industry-native delivery (AP-001):** This Build Pack provides one shared enterprise Product Catalogue. The product types, attribute schemas, and creation forms visible to users are determined by the business's **Industry Edition** via ENG-003k. See [01 – Enterprise Solution Architecture](../../01-enterprise-architecture/01-Enterprise-Solution-Architecture.md) AP-001.

Attribute	Description
Implementation Package	IP-001
Build Pack	BP-003 – Product & Service Catalogue
Name	Product & Service Foundation
Priority	Critical
Depends On	BP-001 Business Setup & Onboarding, BP-002 Party & Relationship Management
Primary Engine	ENG-003f – Product Intelligence Engine
Supporting Engines	ENG-003a Configuration Engine, ENG-003b Localization & Regulatory Engine, ENG-003k Industry Experience Engine, ENG-013 Audit Engine, ENG-015 Document Engine
Objective	Establish a single enterprise Product Catalogue capable of registering and governing every product, service, asset, package, subscription, or offering managed by the organization. Users interact with edition-specific product types; the catalogue engine remains shared.
1. Purpose

The Product & Service Foundation provides the master record for every offering owned by a business.

It is not an inventory module.

It is not a pricing module.

It is not a sales module.

It is the authoritative source of product master data that every future Build Pack consumes.

**Offering Engine (internal architecture):** Developers refer to this capability as the **Offering Engine** — the generic master record for products, services, subscriptions, loans, memberships, courses, rental units, and every other business offering. Database tables retain the frozen `product_*` naming from IP-001. Users never see "Offering"; they see industry-native labels ("Loan Products", "Medical Services", "Courses") resolved by **ENG-003k Industry Experience Engine**.

**Industry Edition integration:** The foundation supports all product types in the data model. The Industry Experience Engine (ENG-003k) controls which types appear in the UI for each edition. Examples:

| Industry Edition | Product types shown | Hidden |
|-----------------|---------------------|--------|
| Banking | Loan Product, Savings Product, Card Product | Rental Unit, Medical Procedure, Course |
| Property | Rental Unit, Property, Parking Space | Loan Product, Medical Procedure, Course |
| Healthcare | Medical Service, Procedure, Medication | Loan Product, Rental Unit, Course |
| Education | Course, Fee Item, Examination | Loan Product, Rental Unit, Medical Procedure |
| Retail | Physical Product, Service, Bundle | Loan Product, Rental Unit, Medical Procedure |

2. Business Objectives
ID	Objective
OBJ-001	Maintain one enterprise product catalogue.
OBJ-002	Support both products and services.
OBJ-003	Support migration of existing catalogues.
OBJ-004	Support onboarding of new offerings.
OBJ-005	Avoid duplicate product definitions.
OBJ-006	Allow every vertical to consume the same catalogue.
OBJ-007	Support complete product governance.
3. Supported Product Types

The foundation must support any business offering.

Type	Examples
Physical Product	Laptop, Fertilizer
Service	Consultation
Rental Asset	House, Vehicle
Subscription	Internet Plan
Membership	Club Membership
Financial Product	Loan
Insurance Product	Motor Cover
Digital Product	Software Licence
Education Product	Course
Hospitality Product	Room
Healthcare Product	Medical Procedure
Agriculture Product	Livestock
4. Scope
Included
Product master
Service master
Product registration
Product lifecycle status
Product ownership
Product migration
Product search
Product identifiers
Product governance
Excluded
Pricing
Inventory
Procurement
Sales
Manufacturing
Booking
CRM

These belong to later Build Packs.

5. Functional Requirements
FR ID	Requirement	Priority
FR-001	Create new products.	High
FR-002	Create new services.	High
FR-003	Support multiple product types.	High
FR-004	Store unique product codes.	High
FR-005	Support internal and external product identifiers.	High
FR-006	Allow migration of existing products.	High
FR-007	Support product ownership.	High
FR-008	Support product lifecycle status.	High
FR-009	Search products.	High
FR-010	Filter products.	High
FR-011	Archive products.	Medium
FR-012	Prevent duplicate products.	High
6. Product Master

Every product must have a single master record.

Core Information
Field
Product ID
Product Code
Product Name
Short Name
Description
Product Type
Status
Category (future IP)
Business Owner
Effective Date
Retirement Date
Ownership

A product can have multiple responsible parties.

Responsibility
Product Owner
Business Sponsor
Technical Owner
Delivery Manager
Support Owner
Sales Owner
Operations Owner

Each responsibility links to BP-002 Party.

7. Product Lifecycle
Status	Description
Draft	Being prepared
Pending Approval	Awaiting governance
Active	Available
Suspended	Temporarily unavailable
Retired	No longer offered
Archived	Historical
8. Product Identification

Support unlimited identifiers.

Examples:

Identifier Type	Example
SKU	SKU-0001
Internal Code	PRD-100
GTIN	978020137962
ISBN	Book
Manufacturer Code	ABC-123
Legacy Code	OLD-908

Future identifier types come from ENG-003b configuration.

9. Migration Support

The platform must support onboarding products from legacy systems.

Capability
Bulk Import
Excel Import
API Import
Manual Registration
Duplicate Detection
Validation
Error Reporting

Migrated products must retain:

Legacy Code
Legacy System
Migration Date
Migration Batch
10. Business Rules
Rule ID	Rule
BR-001	Product Code must be unique within a business.
BR-002	Product Name cannot be blank.
BR-003	Product Type is mandatory.
BR-004	Every product must belong to one Business.
BR-005	Archived products cannot be modified.
BR-006	Active products cannot be deleted.
BR-007	Duplicate products are not allowed.
BR-008	Existing migrated products retain their original identifiers.
11. User Interface

**Presentation principle:** Same Offering Engine; industry-native labels via ENG-003k. Navigation shows edition-specific catalogue names (e.g. "Loan Products" for Banking, "Rental Units" for Property). Database field `owner_party_id` is labelled **Responsible Business Owner** in the UI — Delivery Owner, Reporting Owner, and Operational Owner arrive in IP-013.

Dashboard

Displays:

Total Products
Active Products
Draft Products
Archived Products
Discontinued Products
By Product Type (counts per visible type)
Recently Updated
Quick Actions (Create, Search)
Product List

Supports:

Search
Filters
Sorting
Bulk Actions

Columns:

Code
Name
Type
Status
Responsible Business Owner
Updated
Create Product

Sections (grouped cards — not one long form)

Identity — Product Name, Product Code, Short Name, Description, Product Type
Ownership — Responsible Business Owner
Lifecycle — Status, Default Currency, Launch Date, Retirement Date
Capabilities — Sellable, Purchasable, Bookable, Rentable, Insurable (derived from type), Loan Product (derived from type), Subscription, Digital
Migration — Existing Product?, Legacy Code, Legacy System, Migration Batch

Product Workspace — Overview tab

Overview is composed of the same grouped sections as registration:

Identity
Lifecycle
Ownership
Capabilities
Migration (read-only when migrated)

Implemented tabs: Overview, Timeline, Audit. Remaining tabs are placeholders for future IPs.
12. Process Flow
Create Product
      │
Validate
      │
Duplicate Check
      │
Assign Product ID
      │
Assign Owner
      │
Save Product
      │
Generate Timeline Event
      │
Generate Audit Record
      │
Ready for IP-002 (Classification)
13. Integration Points
Module	Usage
BP-001	Business ownership
BP-002	Product owners (Parties)
ENG-013	Audit
ENG-015	Documents
Timeline	Product history
14. Out of Scope

The following will be implemented in later IPs:

IP	Capability
IP-002	Categories
IP-003	Units of Measure
IP-004	Attributes
IP-005	Variants
IP-006	Bundles
IP-007	Digital Catalogue
IP-008	Lifecycle Management
IP-009	Product Documents
IP-010	Product Timeline
IP-011	Product Audit
IP-012	Product Relationships
IP-013	Offering Governance (final BP-003 IP)
IP-014	Retired → ENG-003m Portfolio & Roadmap Engine
IP-015	Deferred → ENG-003f / BP-013 Product Intelligence
15. Acceptance Criteria
AC ID	Acceptance Criteria
AC-001	Users can create both products and services.
AC-002	Product codes are unique within a business.
AC-003	Existing products can be migrated without losing legacy identifiers.
AC-004	Each product has assigned ownership.
AC-005	Duplicate detection prevents multiple master records for the same product.
AC-006	Products can be searched and filtered efficiently.
AC-007	Product lifecycle status is maintained correctly.
AC-008	Product creation automatically generates Timeline and Audit entries.
AC-009	The product master is reusable by future Build Packs and all vertical solutions without modification.

This IP establishes the enterprise Product Master, forming the foundation on which the remaining BP-003 implementation packages build. It is intentionally lightweight, focusing only on registering and governing products before introducing classification, attributes, pricing, documents, lifecycle, and AI capabilities in subsequent IPs.

CURSOR PROMPT

BP-003 IP-001 — Product & Service Foundation

Implement ONLY IP-001.

Do NOT begin IP-002.

Stop after IP-001 and provide a complete implementation handover.

==========================================================
OBJECTIVE
==========================================================

Build the Product & Service Foundation for the InverBrass Digitalization Platform.

This is NOT an inventory module.

This is the enterprise Product Catalog Engine that will be consumed by every future vertical solution.

The Product Foundation must support:

• Physical Products
• Services
• Digital Products
• Rental Assets
• Subscription Plans
• Insurance Products
• Financial Products
• Memberships
• Property Units
• Healthcare Services
• Educational Courses
• Agricultural Products
• Future product types without schema redesign.

==========================================================
ARCHITECTURE
==========================================================

Build Pack

BP-003 Product & Service Catalogue

Implementation Package

IP-001 Product Foundation

Powered by

ENG-003f Product Intelligence Engine

Supporting Engines

ENG-003a Configuration Engine

ENG-013 Audit Engine

ENG-015 Document Engine

ENG-016 Search Engine

Timeline and Audit must use the existing reusable platform engines.

==========================================================
DESIGN PRINCIPLES
==========================================================

The Product entity represents anything a business offers.

It must NOT assume:

Inventory

Stock

Retail

Sales

Warehouse

Instead it should represent a generic business offering.

Examples

Laptop

Consultation

Hotel Room

Rental Property

Insurance Cover

Mortgage

Membership

Training Course

Tractor Hire

Medical Procedure

Parking Space

Everything should inherit from one Product master.

==========================================================
DATABASE
==========================================================

Create

product

Fields

id

business_id

product_code

product_name

description

product_type

status

owner_party_id

default_currency

launch_date

retirement_date

is_sellable

is_purchasable

is_bookable

is_rentable

is_subscription

is_digital

is_active

metadata (JSONB)

Standard enterprise fields

created_at

created_by

updated_at

updated_by

deleted_at

version

==========================================================
PRODUCT TYPES
==========================================================

Implement configurable product types.

Seed initial values.

PHYSICAL_PRODUCT

SERVICE

DIGITAL_PRODUCT

RENTAL_ASSET

SUBSCRIPTION

MEMBERSHIP

INSURANCE

LOAN_PRODUCT

PROPERTY

COURSE

OTHER

Do NOT hardcode business logic against these values.

==========================================================
STATUS
==========================================================

Support

Draft

Active

Suspended

Discontinued

Archived

==========================================================
BUSINESS RULES
==========================================================

Product Code unique per business.

Product Name required.

Product Type mandatory.

Archived products cannot be edited.

Suspended products cannot be sold or booked.

Soft delete only.

No physical deletion.

==========================================================
REPOSITORIES
==========================================================

Create

ProductRepository

Persistence only.

==========================================================
SERVICES
==========================================================

Create

ProductService

Functions

Create Product

Update Product

Activate Product

Suspend Product

Archive Product

Get Product

Search Products

List Products

Validate Product Code

==========================================================
VALIDATORS
==========================================================

Validate

Unique Product Code

Mandatory Name

Mandatory Type

Status transitions

==========================================================
SERVER ACTIONS
==========================================================

Create

Product Actions

Following the BP-002 architecture.

==========================================================
UI
==========================================================

Create

Product Dashboard

Features

Search

Filters

Create Product

Statistics Cards

Recently Created

Status Summary

Empty State

Product Registration Form

Workspace

==========================================================
PRODUCT WORKSPACE
==========================================================

Create a reusable Product Workspace.

Tabs

Overview

Classification (placeholder for IP-002)

Units (placeholder)

Attributes (placeholder)

Variants (placeholder)

Bundles (placeholder)

Documents (placeholder)

Timeline

Audit History

Relationships (placeholder)

Pricing (placeholder)

Analytics (placeholder)

Implemented tabs should be Overview, Timeline and Audit.

Remaining tabs should display PlatformEmptyState with "Coming in IP-00X".

==========================================================
TIMELINE
==========================================================

Use existing Timeline Engine.

Generate events

**IP-001 (active):**

PRODUCT_CREATED
PRODUCT_UPDATED
PRODUCT_ACTIVATED
PRODUCT_SUSPENDED
PRODUCT_ARCHIVED

**Reserved for future IPs (taxonomy only — no schema change):**

PRODUCT_PRICE_CHANGED
PRODUCT_OWNER_CHANGED
PRODUCT_STATUS_CHANGED
PRODUCT_ATTRIBUTE_ADDED
PRODUCT_BUNDLE_ADDED
PRODUCT_DOCUMENT_UPLOADED
PRODUCT_PUBLISHED

==========================================================
AUDIT
==========================================================

Use Enterprise Audit Engine.

Capture

Create

Update

Status changes

==========================================================
SEARCH
==========================================================

Integrate Platform Search UX.

Searching

No Results

Retry

Success

==========================================================
UX STANDARDS
==========================================================

Use existing platform components.

PlatformWorkspaceHeader

PlatformTabs

PlatformActionResult

PlatformProcessingButton

PlatformEmptyState

PlatformStickyActionBar

PlatformConfirmationDialog

PlatformSearchState

PlatformCompletionCard

PlatformCompletionMeter

Follow UX-001 and UX-001.2 standards.

==========================================================
SMOKE TEST
==========================================================

Create

scripts/bp003-ip001-product-foundation-smoke-validation.ts

Validate

Create Product

Duplicate Code prevention

Update

Suspend

Archive

Timeline

Audit

Search

Workspace

==========================================================
QUALITY GATES
==========================================================

Must pass

TypeScript

ESLint

Production Build

Smoke Validation

==========================================================
HANDOVER
==========================================================

When complete STOP.

Provide the implementation handover in the standard format including:

1. Files Created

2. Files Modified

3. Database Schema

4. Business Rules

5. Architecture

6. UI Components

7. Manual Verification

8. Quality Gates

9. Future Enhancements

Do NOT start IP-002.

==========================================================
IP-001 REFINEMENTS (Industry Experience alignment)
==========================================================

Applied after initial implementation review (2026-07-30):

| Refinement | Priority | Status |
|------------|----------|--------|
| Group Overview into Identity / Lifecycle / Ownership / Capabilities / Migration | High | Implemented |
| Rename UI "Owner" → "Responsible Business Owner" | High | Implemented |
| Filter Product Types by Industry Experience (ENG-003k stub) | High | Implemented |
| Enhanced dashboard KPIs (status breakdown, by type, recently updated) | Medium | Implemented |
| Internal Offering terminology (`product_*` schema frozen) | Medium | Documented |
| Richer timeline event taxonomy (future events reserved) | Low | Implemented |

Implementation locations:

- `src/core/industry-experience/` — nav labels, product type profiles, industry resolution
- `src/modules/product/ui-labels.ts` — user-facing labels (no database terminology)
- `src/modules/product/components/product-capabilities-panel.tsx` — grouped capabilities

==========================================================
FOUNDATION FREEZE
==========================================================

**BP-003 IP-001 is frozen** as of 2026-07-30 alongside BP-001 and BP-002 foundations.

From this point forward:

- Do not change foundational `product_*` schemas unless a genuine architectural gap is discovered.
- Apply industry-specific presentation through ENG-003k and the UI layer.
- Complete remaining IPs (IP-002 onward) without restructuring the core offering master.

See also: Platform Module Catalog §3.2 Foundation Freeze Registry.

One addition I'd recommend

Since you've already established the concept of migration/onboarding for Parties, I'd include one requirement in IP-001:

Products can originate from two sources:

Migrated (existing products imported from legacy systems)
Platform Created (created through the InverBrass Product Workspace)

This can be implemented with a simple record_source field (e.g., MIGRATED, PLATFORM_CREATED, API) and will make later migration projects much cleaner without complicating the design.