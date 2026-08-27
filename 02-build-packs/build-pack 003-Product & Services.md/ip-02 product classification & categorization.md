BP-003 – IP-002 Product Classification & Categorization

> **Industry-native delivery (AP-001):** Classification hierarchies are metadata-driven and shared. Default category templates are seeded per **Industry Edition** via ENG-003k. A bank sees Loans → Retail → Mortgage; a hospital sees Clinical Services → Consultation → Specialist.

Attribute	Description
Implementation Package	IP-002
Build Pack	BP-003 – Product & Service Catalogue
Name	Product Classification & Categorization
Priority	High
Depends On	IP-001 Product Foundation
Primary Engine	ENG-003f Product Intelligence & Performance Engine
Supporting Engines	ENG-003a Configuration Engine, ENG-003b Localization & Regulatory Engine, ENG-003k Industry Experience Engine
Objective	Create a configurable enterprise classification model that organizes every product and service consistently. Default templates vary by Industry Edition; the classification engine is shared.
1. Purpose

Provide a configurable hierarchy that enables products to be grouped, searched, filtered, reported, governed, and analysed.

Classification is metadata—not business logic.

Each Industry Edition may ship default classification templates (e.g. Banking: Loans / Deposits / Cards; Property: Residential / Commercial / Mixed-Use). Businesses customize within their edition boundary.

2. Business Objectives
ID	Objective
OBJ-001	Organize products into configurable hierarchies.
OBJ-002	Support unlimited hierarchy levels.
OBJ-003	Allow different industries to define their own classifications.
OBJ-004	Improve searching and reporting.
OBJ-005	Support AI recommendations and analytics.
OBJ-006	Eliminate hardcoded categories.
3. Scope
Included
Category hierarchy
Category maintenance
Product classification
Classification governance
Category search
Category activation/deactivation
Excluded
Product attributes (IP-004)
Variants (IP-005)
Pricing
Inventory
4. Classification Hierarchy

The hierarchy is metadata-driven and supports unlimited depth.

Category
   ├── Subcategory
   │      ├── Group
   │      │      ├── Family
   │      │      │      └── Product

The platform should not enforce exactly four levels. Different businesses can choose different depths.

5. Examples
Retail
Electronics
    Computers
        Laptops
Healthcare
Clinical Services
    Consultation
        Specialist
Banking
Loans
    Retail
        Mortgage
Property
Property
    Residential
        Apartments
Agriculture
Agriculture
    Crops
        Seed
Education
Education
    Tuition
        Primary School
6. Functional Requirements
FR ID	Requirement	Priority
FR-001	Create categories.	High
FR-002	Create subcategories.	High
FR-003	Support unlimited hierarchy levels.	High
FR-004	Assign products to one or more categories.	High
FR-005	Activate/deactivate categories.	High
FR-006	Search categories.	High
FR-007	Reorder hierarchy.	Medium
FR-008	Prevent duplicate category names within the same parent.	High
FR-009	Move products between categories.	Medium
FR-010	Support category migration.	Medium
7. Category Master

Each category contains:

Field
Category ID
Parent Category
Category Code
Category Name
Description
Display Order
Status
Effective Date
Retirement Date
8. Product Assignment

A product may belong to multiple classifications where appropriate.

Example:

Laptop

Electronics

Student Devices

Promotion Products

This supports multiple reporting perspectives without duplicating products.

9. Business Rules
Rule ID	Rule
BR-001	Category codes must be unique within a business.
BR-002	Parent category cannot reference itself.
BR-003	Circular hierarchies are not allowed.
BR-004	Inactive categories cannot receive new products.
BR-005	Products may belong to multiple categories when configured.
BR-006	Category deletion is only allowed when no active products reference it.
10. User Interface
Category Dashboard

Displays:

Total Categories
Active Categories
Products Assigned
Recently Updated
Category Tree
Electronics
 ├── Computers
 │     ├── Laptop
 │     └── Desktop
 └── Phones

Furniture
 ├── Office
 └── Home

Supports:

Expand/collapse
Drag-and-drop (optional)
Search
Filter
Category Details

Sections:

General
Code
Name
Description
Hierarchy
Parent Category
Child Categories
Assigned Products

List of linked products.

11. Process Flow
Create Category
      │
Validate
      │
Check Parent
      │
Duplicate Check
      │
Save Category
      │
Generate Timeline
      │
Generate Audit
12. Integration Points
Module	Usage
Product Foundation	Assign products
Search Engine	Category filtering
Reporting Engine	Category analytics
AI Engine	Recommendations
Pricing	Category pricing (future)
Inventory	Category reporting (future)
13. Out of Scope

Implemented later:

IP	Capability
IP-003	Units of Measure
IP-004	Product Attributes
IP-005	Product Variants
IP-006	Bundles
IP-007	Digital Catalogue
14. Acceptance Criteria
AC ID	Acceptance Criteria
AC-001	Users can create category hierarchies.
AC-002	Unlimited hierarchy levels are supported.
AC-003	Products can be assigned to one or multiple categories.
AC-004	Duplicate categories are prevented within the same parent.
AC-005	Circular parent-child relationships are prevented.
AC-006	Category activation/deactivation functions correctly.
AC-007	Category changes generate Timeline and Audit entries.
AC-008	Categories are reusable across all current and future vertical solutions.
One enhancement I recommend

Instead of naming this simply "Categories", I'd call it "Classification & Categorization".

That allows the engine to support not only business categories but also future classification dimensions such as:

Classification Dimension	Example
Business Category	Electronics
Industry Classification	Agriculture
Regulatory Classification	Prescription Medicine
Risk Classification	High Risk Product
ESG Classification	Green Product
Reporting Classification	Revenue Product
Marketing Classification	Promotional Item
AI Classification	Frequently Bundled

This keeps BP-003 flexible enough to support sophisticated enterprise reporting and governance without changing the underlying architecture.

Cursor prompt
BP-003 IP-002 – Product Classification & Categorization
BP-003 IP-002 — Product Classification & Categorization

Implement ONLY IP-002.

Do NOT begin IP-003.

Stop after IP-002 and provide a complete implementation handover.

------------------------------------------------------------
OBJECTIVE
------------------------------------------------------------

Implement the Product Classification Engine for the Product Catalogue.

This implementation must support every future vertical (Retail, Banking, Property, Healthcare, Agriculture, Education, Insurance, Hospitality, Manufacturing, Government, NGOs, etc.).

The classification engine must be completely metadata-driven.

No hardcoded hierarchy levels.

No hardcoded category names.

------------------------------------------------------------
ARCHITECTURE
------------------------------------------------------------

This implementation belongs to

BP-003 Product & Service Catalogue

It extends

IP-001 Product Foundation

It is powered by

ENG-003f Product Intelligence & Performance Engine

Supporting engines

ENG-003a Configuration Engine

ENG-013 Audit Engine

ENG-015 Document Engine

------------------------------------------------------------
DESIGN PRINCIPLES
------------------------------------------------------------

DO NOT build a simple Category table.

Instead build an enterprise Classification Engine.

A business must be able to configure any hierarchy.

Examples

Retail

Electronics
    Computers
        Laptop

Healthcare

Clinical Services
    Consultation

Property

Residential
    Apartments

Agriculture

Inputs
    Fertilizer

Education

Training
    Offerings

Banking

Loans
    Mortgage

No assumptions about hierarchy depth.

Unlimited hierarchy.

------------------------------------------------------------
DATABASE
------------------------------------------------------------

Create the following entities.

product_classification

- id
- business_id
- parent_classification_id
- code
- name
- description
- display_order
- hierarchy_level
- status
- effective_date
- retirement_date

Standard enterprise columns

created_at
created_by
updated_at
updated_by
deleted_at
version

------------------------------------------------------------

product_classification_assignment

Allows one product to belong to multiple classifications.

Fields

id

business_id

product_id

classification_id

is_primary

effective_date

retirement_date

Standard audit columns

------------------------------------------------------------
BUSINESS RULES
------------------------------------------------------------

Support unlimited hierarchy.

Prevent circular references.

Category code unique per business.

Cannot delete classification with active children.

Cannot delete classification with assigned active products.

Inactive classifications cannot receive new products.

A product may belong to multiple classifications.

Exactly one assignment may be marked Primary.

------------------------------------------------------------
REPOSITORIES
------------------------------------------------------------

Create repositories

ProductClassificationRepository

ProductClassificationAssignmentRepository

Repositories remain persistence only.

------------------------------------------------------------
SERVICES
------------------------------------------------------------

Create

ProductClassificationService

Capabilities

Create Classification

Update Classification

Move Classification

Deactivate Classification

Assign Product

Remove Assignment

Get Tree

Get Children

Get Product Classifications

Search Classifications

Validate Hierarchy

------------------------------------------------------------
VALIDATORS
------------------------------------------------------------

Create validators for

Hierarchy validation

Duplicate code

Circular hierarchy

Primary assignment

Deletion validation

------------------------------------------------------------
SERVER ACTIONS
------------------------------------------------------------

Create

Product Classification Actions

Assignment Actions

Follow existing BP-002 patterns.

------------------------------------------------------------
UI
------------------------------------------------------------

Create

Product Classification Dashboard

Features

Search

Filters

Tree View

Expand / Collapse

Create Classification

Edit

Deactivate

Assign Products

Product Assignment Panel

Show

Primary Classification

Additional Classifications

------------------------------------------------------------
WORKSPACE
------------------------------------------------------------

Create Product Classification Workspace

Tabs

Overview

Child Classifications

Assigned Products

Timeline

Audit History

Follow the same UX standards already implemented for Party Workspace.

Use

PlatformTabs

PlatformActionResult

PlatformEmptyState

PlatformProcessingButton

PlatformStickyActionBar

PlatformConfirmationDialog

PlatformSearchState

PlatformWorkspaceHeader

------------------------------------------------------------
TIMELINE
------------------------------------------------------------

Integrate with Product Timeline.

Generate events

CLASSIFICATION_CREATED

CLASSIFICATION_UPDATED

CLASSIFICATION_MOVED

PRODUCT_ASSIGNED

PRODUCT_UNASSIGNED

------------------------------------------------------------
AUDIT
------------------------------------------------------------

Integrate with Enterprise Audit Engine.

Record

Create

Update

Delete

Move

Assignment

------------------------------------------------------------
SEARCH
------------------------------------------------------------

Integrate Platform Search UX.

Searching

No Results

Retry

Success

------------------------------------------------------------
QUALITY
------------------------------------------------------------

Implement

Type-safe

Metadata driven

Repository → Service → Actions

No business logic inside repositories

No hardcoded classifications

------------------------------------------------------------
SMOKE TEST
------------------------------------------------------------

Create

scripts/bp003-ip002-product-classification-smoke-validation.ts

Validate

Create hierarchy

Move hierarchy

Assign products

Primary assignment

Duplicate prevention

Circular hierarchy prevention

Search

Deactivate

Timeline

Audit

------------------------------------------------------------
QUALITY GATES
------------------------------------------------------------

Must pass

TypeScript

ESLint

Production Build

Smoke validation

------------------------------------------------------------
HANDOVER
------------------------------------------------------------

When complete stop.

Produce implementation summary exactly like previous Build Packs.

Include

Files Created

Files Modified

Database entities

Architecture

Business Rules

Manual Verification

Quality Gates

Remaining Future Enhancements

Do NOT start IP-003.
One recommendation before Cursor builds this

Since you're now moving into the Product Engine, I'd introduce a new reusable Product Workspace, similar to what you did for Parties. Every subsequent IP (Units of Measure, Attributes, Variants, Documents, Timeline, Audit, Relationships, etc.) can plug into the same workspace instead of creating separate pages.

This will make BP-003 feel like a cohesive enterprise module and save a lot of rework in later IPs.