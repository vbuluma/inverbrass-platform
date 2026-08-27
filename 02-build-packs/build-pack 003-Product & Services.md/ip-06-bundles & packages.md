I would define **IP-006** as one of the most important Build Packs because it transforms individual products into complete commercial offerings. Rather than simply grouping products, it becomes a reusable **Packaging & Bundling Engine** that every vertical can consume.

---

# BP-003 IP-006 – Bundles & Packages

## Objective

Provide a reusable engine for creating offerings composed of one or more products, services, variants, subscriptions, or other bundles.

The bundle itself becomes a first-class catalogue item that can be sold, booked, rented, insured, financed, or subscribed to.

---

# Business Objectives

Support:

* Product bundles
* Service packages
* Subscription bundles
* Promotional packages
* Starter kits
* Composite offerings
* Hospitality packages
* Education programmes
* Insurance packages
* Banking product packages

---

# Examples

## Retail

Laptop Starter Kit

* Laptop
* Mouse
* Laptop Bag
* Antivirus

---

## Banking

Premium Account

* Current Account
* Debit Card
* Mobile Banking
* Internet Banking
* SMS Alerts

---

## Insurance

Motor Insurance Plus

* Comprehensive Cover
* Roadside Assistance
* Windscreen Cover
* Personal Accident Cover

---

## Healthcare

Executive Health Check

* Consultation
* Blood Tests
* X-Ray
* ECG
* Report

---

## Education

Computer Course Package

* Beginner
* Intermediate
* Final Assessment
* Certificate

---

## Property

Rental Package

* Apartment
* Parking
* WiFi
* Cleaning

---

## Hospitality

Weekend Package

* Room
* Breakfast
* Spa
* Airport Transfer

---

# Database

## product_bundle

Stores the master bundle.

| Field          | Description                           |
| -------------- | ------------------------------------- |
| id             | PK                                    |
| business_id    | Tenant                                |
| bundle_code    | Unique                                |
| bundle_name    | Name                                  |
| bundle_type    | Starter Kit, Package, Promotion, etc. |
| status         | Lifecycle                             |
| owner_party_id | Business owner                        |
| effective_from | Start date                            |
| effective_to   | End date                              |
| record_source  | Platform/API/Migration                |
| metadata       | JSON                                  |
| audit fields   | Standard                              |

---

## product_bundle_item

Stores bundle contents.

| Field         | Description |
| ------------- | ----------- |
| id            | PK          |
| bundle_id     | Parent      |
| product_id    | Product     |
| variant_id    | Optional    |
| quantity      | Quantity    |
| mandatory     | Required?   |
| display_order | Display     |
| metadata      | JSON        |

---

# Bundle Types

Configurable.

Examples

* Standard Package
* Starter Kit
* Promotional Bundle
* Subscription Bundle
* Cross-Sell Bundle
* Upsell Bundle
* Service Package
* Composite Product

---

# Business Rules

A bundle:

* Must contain at least one item
* May contain unlimited items
* May contain products
* May contain variants
* May contain services
* May contain subscriptions
* May contain other bundles (optional—see note below)

Duplicate items prevented.

Archived items cannot be added.

Inactive products cannot be bundled.

---

# Bundle Pricing

**Do not implement pricing yet.**

Only support:

```
Bundle Pricing Strategy

• Sum of Items
• Fixed Bundle Price
• Percentage Discount
• Future Rule
```

Actual calculations belong in the Pricing Engine later.

---

# Bundle Availability

Future-ready fields only.

Supports:

* Active
* Seasonal
* Limited Offer
* Permanent

---

# Bundle Lifecycle

Support:

* Draft
* Active
* Suspended
* Archived

---

# Timeline

Events

* Bundle Created
* Item Added
* Item Removed
* Item Quantity Changed
* Bundle Activated
* Bundle Archived

---

# Audit

Track:

* Bundle Name
* Bundle Code
* Bundle Items
* Quantities
* Owner
* Status

---

# UI

## Bundle Dashboard

Shows

* Total Bundles
* Active
* Draft
* Archived
* Recently Updated

---

## Bundle Registration

Wizard

Step 1

Bundle Details

Step 2

Select Products

Step 3

Configure Quantities

Step 4

Review

---

## Bundle Workspace

Tabs

* Overview
* Bundle Items
* Timeline
* Audit

---

# Search

Search by

* Bundle Code
* Bundle Name
* Product inside bundle
* Owner
* Status

---

# Industry Experience (ENG-003k)

Different industries see different terminology.

| Industry    | User Label         |
| ----------- | ------------------ |
| Retail      | Bundles            |
| Banking     | Product Packages   |
| Insurance   | Insurance Packages |
| Healthcare  | Care Packages      |
| Education   | Programmes         |
| Property    | Rental Packages    |
| Hospitality | Offers             |
| Agriculture | Input Packages     |

Internally everything remains **Product Bundle**.

---

# Architecture

```
Product Foundation
        │
        ▼
Variants
        │
        ▼
Bundles
        │
        ▼
Pricing (future)
        │
        ▼
Sales (future)
```

---

# Integration

Consumes:

* IP-001 Product Foundation
* IP-002 Classification
* IP-003 Units
* IP-004 Attributes
* IP-005 Variants

Future consumers:

* Pricing Engine
* Inventory Engine
* Sales Engine
* CRM
* AI Engine

---

# Future Enhancements

Reserved for later Build Packs:

* Bundle pricing
* Inventory explosion (kit components)
* Nested bundles (bundle inside bundle)
* Bundle recommendations via AI
* Dynamic bundles
* Customer-specific bundles
* Auto-generated bundles

## Architectural recommendation

I would **not implement nested bundles (a bundle containing another bundle) in IP-006**. While some enterprise systems support it, it introduces recursion, pricing complexity, inventory explosion, and circular dependency risks. Start with bundles containing **products and variants only**. If a future banking or insurance use case genuinely requires nested bundles, you can add it in a later enhancement once the pricing and inventory engines are in place. This keeps IP-006 simpler, easier to test, and scalable.

Cursor Prompt

You are implementing BP-003 IP-006 – Bundles & Packages.

IMPORTANT

This is IP-006 ONLY.

Do NOT implement:
- Pricing calculations
- Inventory explosion
- Nested bundles (bundle inside bundle)
- Sales
- Promotions
- AI recommendations

Follow the existing architecture exactly.

====================================================
FOUNDATION
====================================================

Reuse existing platform standards:

ENG-003f Product Intelligence Engine
ENG-013 Audit Engine
ENG-016 Search Engine
Product Timeline Engine
Platform UI Standards
Workspace standards
Timeline standards
Audit standards

Use the same architecture as Product Foundation:

Validators
→ Rules
→ Service
→ Repository
→ Server Actions
→ UI

No business logic inside repositories.

====================================================
OBJECTIVE
====================================================

Build the Product Bundle Engine.

A bundle is a reusable commercial offering composed of one or more products, services, subscriptions or variants.

Examples

Retail
---------
Laptop
Mouse
Bag

Bank
---------
Current Account
Debit Card
Internet Banking

Healthcare
---------
Consultation
Lab Test
X-Ray

Education
---------
Course
Exam
Certificate

Hospitality
---------
Room
Breakfast
Spa

====================================================
DATABASE
====================================================

Create migration:

0031_bp003_ip006_product_bundles.sql

Create tables:

product_bundle

Fields

id
business_id
bundle_code
bundle_name
bundle_type
status_code
owner_party_id
description
effective_from
effective_to
record_source
metadata
created_at
updated_at
deleted_at
version

Unique

business_id + bundle_code

----------------------------------------------------

product_bundle_item

Fields

id
bundle_id
product_id
variant_id (nullable)
quantity
mandatory
display_order
metadata
created_at
updated_at

Indexes

bundle_id

product_id

====================================================
BUSINESS RULES
====================================================

Implement rules

A bundle

must contain at least one item

may contain unlimited items

may contain

Products

Variants

Services

Subscriptions

DO NOT ALLOW

Bundle inside Bundle

Reject if attempted.

Reject duplicate products within same bundle.

Inactive products cannot be added.

Archived products cannot be added.

Deleting a product must not delete bundles.

====================================================
MODULE LAYER
====================================================

Create

repositories

product-bundle-repository.ts

product-bundle-item-repository.ts

validators

product-bundle-validators.ts

services

product-bundle-rules.ts

product-bundle-service.ts

actions

product-bundle-actions.ts

====================================================
UI
====================================================

Create

Bundle Dashboard

/products/bundles

Bundle Registration

/products/bundles/new

Bundle Workspace

/products/bundles/[bundleId]

====================================================
Bundle Dashboard
====================================================

KPIs

Total Bundles

Active

Draft

Archived

Recently Updated

Search

Create Bundle

====================================================
Bundle Registration
====================================================

Wizard

Step 1

Bundle Details

Bundle Code

Bundle Name

Description

Bundle Type

Responsible Business Owner

Status

Step 2

Select Products

Search products

Add

Remove

Quantity

Mandatory

Display Order

Step 3

Review

Completion Card

====================================================
Bundle Workspace
====================================================

Tabs

Overview

Bundle Items

Timeline

Audit

Placeholder tabs for future

Pricing

Analytics

====================================================
TIMELINE
====================================================

Events

Bundle Created

Bundle Updated

Bundle Activated

Bundle Suspended

Bundle Archived

Item Added

Item Removed

Quantity Changed

====================================================
AUDIT
====================================================

Audit

Bundle Name

Bundle Code

Status

Items

Owner

====================================================
SEARCH
====================================================

Use PlatformSearchState

Searching

No Results

Error

Success

====================================================
DOCUMENTATION
====================================================

Update

build-pack 003 scope

IP-006 document

Platform Module Catalog

====================================================
SMOKE TEST
====================================================

Create

bp003-ip006-product-bundle-smoke-validation.ts

Validate

Bundle creation

Duplicate prevention

Inactive product rejection

Archived product rejection

Timeline

Audit

Workspace

Dashboard

====================================================
QUALITY GATES
====================================================

Must pass

TypeScript

ESLint

Production Build

Smoke Validation

====================================================
IMPORTANT
====================================================

DO NOT

Implement pricing

Implement discounts

Implement inventory explosion

Implement nested bundles

Implement AI

Implement promotions

Leave placeholders where appropriate.

====================================================
OUTPUT
====================================================

When complete provide ONLY:

1. Files Created

2. Files Modified

3. Database Schema

4. Business Rules

5. Architecture

6. UI Components

7. Manual Verification

8. Quality Gates

9. Future Enhancements

Stop after IP-006.
Do NOT begin IP-007.

---

## Implementation Record — IP-006 (2026-08-01)

**Branch:** `feature/bp003-catalogue`  
**Migration:** `03-platform/drizzle/0034_bp003_ip006_product_bundles.sql`  
**Smoke script:** `03-platform/scripts/bp003-ip006-product-bundles-smoke-validation.ts`

### Delivered

- Product bundle CRUD, lifecycle (activate/suspend/archive), item management, and search
- Bundle registration wizard (details → select products → configure → review)
- Duplicate item prevention; inactive/archived product rejection
- Pricing strategy and availability placeholders (no calculations)
- Bundle timeline + product timeline events + ENG-013 audit
- Industry Experience bundle terminology (`bundle-terminology.ts`)
- Dashboard at `/products/bundles`, registration at `/products/bundles/new`, workspace at `/products/bundles/[bundleId]`
- Product Workspace **Bundles** tab — bundles containing this product

### Integration handover (shared files — not edited per agent rules)

1. `03-platform/src/db/schema/index.ts` — export IP-004 through IP-006 schema modules
2. `03-platform/drizzle/meta/_journal.json` — register migrations `0032`–`0034`
3. Run migrations against Supabase PostgreSQL before runtime use

### Quality gates

| Gate | Result |
|------|--------|
| ESLint | Pass (0 errors) |
| Production build | Pass |
| Smoke validation | 53/54 pass (journal registration pending integration) |

This prompt keeps IP-006 tightly scoped while ensuring it integrates cleanly with your existing Product Foundation and leaves pricing, inventory, and advanced commercial logic for later Build Packs.