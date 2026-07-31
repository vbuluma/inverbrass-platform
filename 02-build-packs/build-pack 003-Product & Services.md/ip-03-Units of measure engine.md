I think IP-003 is one of the most important implementation packages in BP-003 because it becomes the **measurement standard** used across the entire platform. It should be far more than a simple "Units of Measure" table.

---

# BP-003 IP-003 – Units of Measure (UoM) Engine

## Objective

Provide a configurable, reusable Unit of Measure (UoM) Engine that standardizes how quantities are measured, priced, stocked, rented, booked, reported, and analyzed across all industries.

The engine shall support multiple industries without code changes and enable conversion, validation, and reporting using standardized measurement definitions.

---

# Business Objectives

* Standardize measurement across the platform.
* Eliminate duplicate unit definitions.
* Support industry-specific units through configuration.
* Enable automatic unit conversions.
* Support pricing, costing, inventory, scheduling, rentals, subscriptions, and analytics.
* Ensure consistency in reporting and integrations.

---

# Scope

The engine shall manage:

* Unit definitions
* Unit categories
* Unit conversions
* Default units
* Precision and decimal rules
* Industry applicability
* Status lifecycle
* Timeline
* Audit history

---

# Functional Requirements

| FR ID  | Requirement                          | Priority |
| ------ | ------------------------------------ | -------- |
| FR-001 | Create configurable Units of Measure | High     |
| FR-002 | Group units into categories          | High     |
| FR-003 | Configure base units                 | High     |
| FR-004 | Configure conversion factors         | High     |
| FR-005 | Configure decimal precision          | High     |
| FR-006 | Configure rounding rules             | Medium   |
| FR-007 | Configure industry applicability     | High     |
| FR-008 | Activate / Suspend / Archive units   | Medium   |
| FR-009 | Track timeline                       | Medium   |
| FR-010 | Maintain audit history               | High     |

---

# Unit Categories

Every unit belongs to a category.

Examples:

| Category            | Examples                    |
| ------------------- | --------------------------- |
| Quantity            | Piece, Pack, Box, Carton    |
| Weight              | Gram, Kilogram, Ton         |
| Volume              | Litre, Millilitre, Gallon   |
| Length              | Metre, Kilometre            |
| Area                | Square Metre, Acre, Hectare |
| Time                | Minute, Hour, Day, Month    |
| Capacity            | Seat, Bed, Room             |
| Energy              | KWh                         |
| Currency Equivalent | Points, Credits (optional)  |

---

# Example Units

| Unit       | Category |
| ---------- | -------- |
| Piece      | Quantity |
| Box        | Quantity |
| Carton     | Quantity |
| Kilogram   | Weight   |
| Gram       | Weight   |
| Ton        | Weight   |
| Litre      | Volume   |
| Millilitre | Volume   |
| Hour       | Time     |
| Day        | Time     |
| Month      | Time     |
| Acre       | Area     |
| Hectare    | Area     |
| Room       | Capacity |
| Seat       | Capacity |

---

# Unit Definition

Each unit contains:

* Code
* Name
* Symbol
* Category
* Base Unit
* Precision
* Decimal Places
* Conversion Factor
* Active Status
* Industry Visibility

---

# Unit Conversion

Example:

Weight

```
1 Ton
 = 1000 Kilograms

1 Kilogram
 = 1000 Grams
```

Volume

```
1 Litre
 = 1000 Millilitres
```

Quantity

```
1 Carton
 = 24 Pieces
```

Time

```
1 Day
 = 24 Hours

1 Month
 = 30 Days (configurable)
```

---

# Business Rules

| Rule ID | Rule                                                   |
| ------- | ------------------------------------------------------ |
| BR-001  | Every unit belongs to one category                     |
| BR-002  | Every category has one base unit                       |
| BR-003  | Conversion only allowed within the same category       |
| BR-004  | Conversion factors must be positive                    |
| BR-005  | Archived units cannot be assigned to new offerings     |
| BR-006  | Existing offerings continue referencing archived units |
| BR-007  | Symbols must be unique within a category               |
| BR-008  | Unit codes must be unique per tenant                   |

---

# Industry Examples

## Retail

Piece

Pack

Carton

Box

Bottle

Can

---

## Agriculture

Kilogram

Ton

Bag

Acre

Hectare

Litre

---

## Healthcare

Tablet

Capsule

Dose

Millilitre

Litre

Bed

---

## Property

Unit

Apartment

Square Metre

Square Foot

Room

Parking Space

---

## Education

Student

Course

Credit Hour

Semester

---

## Banking

Account

Loan

Policy

Transaction

Although banking rarely measures physical quantities, configurable units allow consistent reporting and pricing models.

---

# User Interface

## Dashboard

Displays:

* Total Units
* Active Units
* Categories
* Recently Updated
* Quick Actions

---

## Registration

Capture:

* Unit Code
* Unit Name
* Symbol
* Category
* Base Unit
* Conversion Factor
* Precision
* Status

---

## Workspace

Tabs:

* Overview
* Conversion Rules
* Timeline
* Audit History

---

# Timeline Events

Examples:

* Unit Created
* Conversion Updated
* Symbol Changed
* Category Changed
* Activated
* Suspended
* Archived

---

# Audit History

Tracks:

* User
* Date
* Changed Field
* Previous Value
* New Value
* Source Module

---

# Architecture

```
Offering
        │
        ▼
Unit of Measure
        │
        ▼
Conversion Engine
        │
        ▼
Pricing
Inventory
Scheduling
Reporting
Analytics
```

The UoM Engine is a shared platform capability that will later be consumed by:

* Pricing Engine
* Inventory Engine
* Purchasing Engine
* Sales Engine
* Booking Engine
* Rental Engine
* Manufacturing (future)
* Reporting Engine

---

# Dependencies

### Depends on

* BP-003 IP-001 – Product & Service Foundation
* BP-003 IP-002 – Categories & Classification

### Future Consumers

* Pricing Engine
* Inventory & Purchasing
* Sales & Checkout
* Reporting Engine
* AI Engine

---

## My recommendation (one enhancement)

Given the direction of the platform, I would rename this from **"Units of Measure"** to **"Measurement & Units Engine"** in the architecture, while keeping **"Units of Measure"** as the user-facing label.

This allows the engine to evolve beyond traditional units into things like:

* Subscription periods (Month, Quarter, Year)
* Capacity units (Seat, Room, Bed)
* Service effort (Hour, Session, Visit)
* Resource allocation units
* Future carbon or sustainability metrics

Without requiring another foundational redesign later. Since we've agreed to freeze foundations after they're built, making this slightly broader now gives you more flexibility while preserving a clean architecture.


Cusor Prompt

BP-003 IP-003 — Units of Measure Engine

Read first (mandatory):

1. 02-build-packs/build-pack 003-Product & Services.md/build-pack -003 Scope.md
2. 02-build-packs/build-pack 003-Product & Services.md/ip-03-units of measure.md
3. 01-enterprise-architecture/02-Platform-Module-Catalog.md
4. 01-enterprise-architecture/06b-UX & Interaction Standards.md

This implementation MUST follow all established platform standards from BP-001, BP-002 and BP-003 IP-001.

----------------------------------------------------
OBJECTIVE
----------------------------------------------------

Implement the reusable Units of Measure Engine.

This engine standardizes measurements across every industry supported by the platform.

Examples:

Quantity
Weight
Volume
Length
Area
Time
Capacity

The engine must support configurable conversion rules.

Future Build Packs must consume this engine instead of defining their own units.

----------------------------------------------------
DATABASE
----------------------------------------------------

Create Drizzle schema and migration for:

unit_category

id
business_id
code
name
description
base_unit_id (nullable initially)
status
metadata
audit fields
soft delete
version

unit_of_measure

id
business_id
category_id
code
name
symbol
conversion_factor
decimal_precision
rounding_rule
is_base_unit
status
metadata
audit fields
soft delete
version

Rules:

Unit code unique per business

Only one base unit per category

Conversion factor > 0

Archived units cannot be assigned to new offerings

----------------------------------------------------
SEED DATA
----------------------------------------------------

Seed default categories:

Quantity
Weight
Volume
Length
Area
Time
Capacity

Seed units:

Piece
Pack
Box
Carton

Gram
Kilogram
Ton

Millilitre
Litre

Metre
Kilometre

Square Metre
Acre
Hectare

Minute
Hour
Day
Month

Seat
Room
Bed

----------------------------------------------------
SERVICES
----------------------------------------------------

Implement:

UnitCategoryRepository

UnitRepository

UnitRules

UnitService

Validation:

Unique codes

Positive conversion factor

Single base unit

Category exists

----------------------------------------------------
CONVERSION
----------------------------------------------------

Implement UnitConversionService.

Support:

Convert between units within same category.

Examples:

1 Ton = 1000 Kilograms

1 Kilogram = 1000 Grams

1 Litre = 1000 Millilitres

1 Carton = 24 Pieces

Reject conversion across different categories.

----------------------------------------------------
UI
----------------------------------------------------

Create:

Unit Dashboard

Displays:

Total Units

Active Units

Categories

Recent Updates

Quick Actions

Registration Screen

Fields:

Category

Code

Name

Symbol

Base Unit checkbox

Conversion Factor

Decimal Precision

Rounding Rule

Status

Workspace

Tabs:

Overview

Conversion Rules

Timeline

Audit History

Use all platform UX standards:

PlatformWorkspaceHeader

PlatformTabs

PlatformActionResult

PlatformSearchState

PlatformCompletionCard

PlatformStickyActionBar

PlatformEmptyState

PlatformDocumentPreview where applicable

----------------------------------------------------
TIMELINE
----------------------------------------------------

Create reusable product timeline events:

UNIT_CREATED

UNIT_UPDATED

UNIT_CONVERSION_CHANGED

UNIT_ACTIVATED

UNIT_SUSPENDED

UNIT_ARCHIVED

----------------------------------------------------
AUDIT
----------------------------------------------------

Integrate with Audit Engine.

Track:

Code

Name

Category

Conversion

Precision

Status

----------------------------------------------------
NAVIGATION
----------------------------------------------------

Products

    Categories

    Units of Measure

----------------------------------------------------
QUALITY
----------------------------------------------------

Must pass:

TypeScript

ESLint

Production build

Create smoke validation:

scripts/bp003-ip003-unit-engine-smoke-validation.ts

----------------------------------------------------
DOCUMENTATION
----------------------------------------------------

Update:

Build Pack document

IP-003 document

Architecture references

----------------------------------------------------
IMPORTANT

DO NOT start IP-004.

Stop after IP-003.

Return implementation handover in the same format used for previous IPs:

1. Files Created

2. Files Modified

3. Database Schema

4. Business Rules

5. Architecture

6. UI Components

7. Manual Verification

8. Quality Gates

9. Future Integration

------------------------------------------------------------
IMPLEMENTATION HANDOVER — IP-003 COMPLETE
------------------------------------------------------------

### 1. Files Created

**Database**
- `03-platform/drizzle/0031_bp003_ip003_unit_engine.sql`
- `03-platform/src/db/schema/unit-category.ts`
- `03-platform/src/db/schema/unit-of-measure.ts`
- `03-platform/src/db/schema/unit-timeline.ts`
- `03-platform/src/db/seeds/unit-defaults.ts`
- `03-platform/src/db/seeds/unit-defaults-seed.ts`

**Core**
- `03-platform/src/core/unit-timeline/` (constants, types, helpers, repository, service, index)

**Module**
- `03-platform/src/modules/product/repositories/unit-category-repository.ts`
- `03-platform/src/modules/product/repositories/unit-repository.ts`
- `03-platform/src/modules/product/services/unit-rules.ts`
- `03-platform/src/modules/product/services/unit-conversion-service.ts`
- `03-platform/src/modules/product/services/unit-service.ts`
- `03-platform/src/modules/product/services/unit-audit-query-service.ts`
- `03-platform/src/modules/product/validators/unit-validators.ts`
- `03-platform/src/modules/product/actions/unit-actions.ts`
- `03-platform/src/modules/product/unit-ui-labels.ts`
- `03-platform/src/modules/product/components/unit-dashboard.tsx`
- `03-platform/src/modules/product/components/unit-registration-form.tsx`
- `03-platform/src/modules/product/components/unit-workspace.tsx`
- `03-platform/src/modules/product/components/unit-timeline-panel.tsx`
- `03-platform/src/modules/product/components/unit-audit-history-panel.tsx`

**Routes**
- `03-platform/src/app/(authenticated)/(app)/products/units/page.tsx`
- `03-platform/src/app/(authenticated)/(app)/products/units/new/page.tsx`
- `03-platform/src/app/(authenticated)/(app)/products/units/[unitId]/page.tsx`

**Validation**
- `03-platform/scripts/bp003-ip003-unit-engine-smoke-validation.ts`

### 2. Files Modified

- `03-platform/drizzle/meta/_journal.json` — migration 0031
- `03-platform/src/db/schema/index.ts` — unit schema exports
- `03-platform/src/modules/product/constants.ts` — unit status/rounding constants; Units tab enabled
- `03-platform/src/modules/product/errors.ts` — unit error codes
- `03-platform/src/modules/product/types.ts` — unit view/payload types
- `03-platform/src/core/product-timeline/constants.ts` — UNIT_* event taxonomy
- `03-platform/src/core/audit/constants.ts` — `unit_of_measure`, `unit_category` entities
- `03-platform/src/modules/product/components/product-dashboard.tsx` — Units quick action

### 3. Database Schema

| Table | Scope | Purpose |
|-------|-------|---------|
| `unit_category` | Business | Category groups (Quantity, Weight, etc.) with optional `base_unit_id` |
| `unit_of_measure` | Business | Unit definitions with conversion factor, precision, rounding |
| `unit_timeline` | Business | Append-only unit lifecycle events |

Default categories and units are bootstrapped per business on first dashboard access via `seedDefaultUnitsForBusiness()`.

### 4. Business Rules

| Rule | Implementation |
|------|----------------|
| BR-001 | Every unit belongs to one category (`category_id` FK) |
| BR-002 | One base unit per category enforced in `UnitService` |
| BR-003 | `UnitConversionService` rejects cross-category conversion |
| BR-004 | Positive conversion factor validated in rules + Zod |
| BR-005 | `isUnitAssignable()` blocks archived units for new assignments |
| BR-007 | Unique symbol per category (partial unique index + service check) |
| BR-008 | Unique code per business (partial unique index + service check) |

### 5. Architecture

```
UnitService / UnitConversionService
        │
        ├── UnitCategoryRepository / UnitRepository
        ├── UnitTimelineService (unit_timeline)
        ├── AuditService (ENG-013)
        └── seedDefaultUnitsForBusiness (bootstrap)
```

Future consumers: Pricing, Inventory, Purchasing, Sales, Booking, Rental, Reporting (ENG-003f catalogue foundation).

### 6. UI Components

| Route | Component |
|-------|-----------|
| `/products/units` | `UnitDashboard` — KPIs, search, categories, recent updates |
| `/products/units/new` | `UnitRegistrationForm` |
| `/products/units/[unitId]` | `UnitWorkspace` — Overview, Conversion Rules, Timeline, Audit |

Navigation: Products dashboard → Quick Actions → **Units of Measure**

### 7. Manual Verification

1. Run migration: `npx drizzle-kit migrate` (or platform migration workflow)
2. Sign in, select a business, open `/products/units`
3. Confirm default categories/units appear (Quantity, Weight, Volume, etc.)
4. Register a custom unit; verify workspace tabs and lifecycle actions
5. Test conversion on Conversion Rules tab (e.g. 1 kg → 1000 g)
6. Confirm timeline and audit entries on create/update/archive

### 8. Quality Gates

| Gate | Result |
|------|--------|
| TypeScript | Pass |
| ESLint | Pass (no new errors) |
| Production build | Pass |
| Smoke validation | Pass — `npx tsx scripts/bp003-ip003-unit-engine-smoke-validation.ts` |

### 9. Future Integration

- **IP-004+**: Product attributes and offerings reference `unit_of_measure.id`
- **Pricing / Inventory engines**: consume `UnitConversionService.convertByIds()`
- **Industry Experience (ENG-003k)**: filter visible unit categories by industry profile
- **Do not start IP-004** until IP-003 is reviewed and migration applied in target environments
