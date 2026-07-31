IP-005 is where your **Offering Engine** starts becoming enterprise-grade. Variants are not just for retail—they're essential across nearly every industry. The key is to think of a **variant as a sellable/versioned instance of a master offering**, rather than only "size and color."

---

# BP-003 IP-005 – Product Variants Engine

## Objective

Provide a reusable engine that manages multiple sellable versions (variants) of a single master product or service while inheriting common information from the parent offering.

The Variant Engine must support physical products, services, subscriptions, insurance, banking products, hospitality, healthcare, education, agriculture, and future industries.

---

# Functional Requirements

| FR ID  | Requirement                                                |
| ------ | ---------------------------------------------------------- |
| FR-001 | Create variants from a master offering                     |
| FR-002 | Support unlimited variants per offering                    |
| FR-003 | Allow variant-specific codes (SKU/Variant Code)            |
| FR-004 | Allow variant-specific names                               |
| FR-005 | Inherit parent information automatically                   |
| FR-006 | Override selected parent properties                        |
| FR-007 | Configure variant attributes                               |
| FR-008 | Activate/Suspend/Archive variants                          |
| FR-009 | Search variants                                            |
| FR-010 | Track variant timeline                                     |
| FR-011 | Audit all variant changes                                  |
| FR-012 | Support future inventory, pricing and taxation integration |

---

# Business Examples

### Retail

Master Product

iPhone 17

Variants

* 128GB Black
* 128GB Blue
* 256GB Black
* 512GB Titanium

---

### Banking

Master Product

Personal Loan

Variants

* Salary Loan
* Emergency Loan
* Premium Loan

---

### Insurance

Master Product

Motor Insurance

Variants

* Third Party
* Comprehensive
* Commercial

---

### Property

Master Product

Apartment Type A

Variants

* Ground Floor
* First Floor
* Penthouse

---

### Healthcare

Master Product

Consultation

Variants

* General Consultation
* Specialist Consultation
* Online Consultation

---

### Education

Master Product

Computer Course

Variants

* Beginner
* Intermediate
* Advanced

---

### Agriculture

Master Product

Maize Seed

Variants

* 1kg
* 5kg
* 10kg
* 25kg

---

# Database Requirements

## product_variant

| Field         | Description                           |
| ------------- | ------------------------------------- |
| id            | PK                                    |
| business_id   | Tenant                                |
| product_id    | Parent offering                       |
| variant_code  | Unique code                           |
| variant_name  | Display name                          |
| status        | Draft / Active / Suspended / Archived |
| display_order | Ordering                              |
| record_source | Migrated / Platform / API             |
| metadata      | JSON                                  |
| audit fields  | Standard                              |
| version       | Optimistic locking                    |

---

## product_variant_attribute

Stores attribute overrides.

Example

| Variant      | Attribute | Value |
| ------------ | --------- | ----- |
| iPhone 256GB | Storage   | 256GB |
| iPhone Black | Colour    | Black |

---

# Inheritance Rules

Variants inherit from parent unless overridden.

Inherited

* Description
* Classification
* Units
* Documents
* Images
* Owner
* Timeline relationship

Can override

* Name
* Code
* Attributes
* Status
* Future price
* Future inventory

---

# Business Rules

| Rule   | Description                                             |
| ------ | ------------------------------------------------------- |
| BR-001 | Variant belongs to one master offering                  |
| BR-002 | Variant code unique per business                        |
| BR-003 | Variant inherits parent by default                      |
| BR-004 | Archived parent archives variants                       |
| BR-005 | Archived variants cannot be transacted                  |
| BR-006 | Duplicate variant combinations not allowed              |
| BR-007 | Parent cannot reference itself as variant               |
| BR-008 | Variant must have at least one distinguishing attribute |

---

# Variant Combination Validation

Prevent duplicates.

Example

Allowed

```text
Storage = 128GB
Colour = Black
```

Allowed

```text
Storage = 128GB
Colour = Blue
```

Reject

```text
Storage = 128GB
Colour = Black
```

(already exists)

---

# UI Requirements

## Variant Dashboard

Display

* Total Variants
* Active
* Draft
* Archived
* Parent Offerings
* Recently Updated

---

## Variant Registration

Fields

* Parent Offering
* Variant Code
* Variant Name
* Variant Attributes
* Status

---

## Product Workspace

New tab

**Variants**

Functions

* Add Variant
* Edit Variant
* Clone Variant
* Archive Variant
* Activate Variant

---

# Search

Search by

* Variant Code
* Variant Name
* Parent Offering
* Attribute
* Status

---

# Timeline

Events

* Variant Created
* Variant Updated
* Variant Activated
* Variant Suspended
* Variant Archived
* Variant Cloned

---

# Audit

Track

* Attribute changes
* Name changes
* Status changes
* Parent changes
* Override changes

---

# Non-Functional Requirements

* Multi-business
* Metadata-driven
* Scalable
* Soft delete
* Version controlled
* Timeline enabled
* Audit enabled
* Searchable
* Industry-aware (ENG-003k)

---

# Future Integration

IP-005 provides the foundation for:

* IP-006 Bundles & Packages
* IP-008 Lifecycle
* IP-009 Documents
* IP-010 Timeline
* Inventory Engine
* Pricing Engine
* Tax Engine
* AI Engine
* Reporting Engine

---

## Recommendation for your architecture

I would make one important design decision now:

**Variants should not be mandatory.**

Many offerings (e.g., a single consultancy service, a one-off government permit, or a fixed subscription plan) will never have variants. The system should support:

* **Simple Offering** → no variants.
* **Variant-enabled Offering** → one or many variants.

This keeps the platform simple for SMEs while scaling seamlessly for enterprises that need sophisticated product catalogs. Once implemented this way, IP-005 becomes a reusable capability across all your Industry Experiences without forcing unnecessary complexity.

CURSOR PROMPT

BP-003 IP-005 — Product Variants Engine

Read first (Mandatory)

1. 02-build-packs/build-pack 003-Product & Services.md/build-pack -003 Scope.md
2. 02-build-packs/build-pack 003-Product & Services.md/ip-05-product variants.md
3. 01-enterprise-architecture/02-Platform-Module-Catalog.md
4. 01-enterprise-architecture/06b-UX & Interaction Standards.md

Also study existing implementations:

• BP-003 IP-001 Product Foundation
• BP-003 IP-002 Product Classification
• BP-003 IP-003 Units of Measure
• BP-003 IP-004 Product Attributes Engine

Follow existing platform architecture exactly.

----------------------------------------------------
OBJECTIVE
----------------------------------------------------

Implement the Product Variant Engine.

A Variant is a sellable/versioned instance of a master Offering.

Examples

Retail

iPhone
    128GB Black
    128GB Blue
    256GB Black

Property

Apartment Type A
    Ground Floor
    First Floor
    Penthouse

Healthcare

Consultation
    General
    Specialist
    Online

Banking

Personal Loan
    Salary Loan
    Emergency Loan
    Premium Loan

Insurance

Motor Insurance
    Third Party
    Comprehensive

Education

Computer Course
    Beginner
    Intermediate
    Advanced

Agriculture

Maize Seed
    1kg
    5kg
    10kg

----------------------------------------------------
DATABASE
----------------------------------------------------

Create

product_variant

Fields

id

business_id

product_id

variant_code

variant_name

status

display_order

record_source

metadata

audit fields

soft delete

version

Create

product_variant_attribute

Fields

id

business_id

variant_id

attribute_definition_id

attribute_value

metadata

audit fields

soft delete

version

----------------------------------------------------
BUSINESS RULES
----------------------------------------------------

Variant belongs to one Product

Unlimited variants per Product

Variant Code unique per business

Variant inherits parent properties by default

Variant may override:

Name

Attributes

Future Pricing

Future Inventory

Future Tax

Variant combinations must be unique

Example

Storage=128GB + Colour=Black

cannot exist twice.

Archived parent archives variants.

Archived variants cannot be transacted.

Variant must contain at least one distinguishing attribute.

----------------------------------------------------
SERVICES
----------------------------------------------------

Repositories

ProductVariantRepository

ProductVariantAttributeRepository

Services

ProductVariantService

ProductVariantValidationService

Rules

ProductVariantRules

----------------------------------------------------
UI
----------------------------------------------------

Create

Variant Dashboard

Variant Workspace

Variant Registration

Add Variants tab to Product Workspace.

Functions

Create Variant

Clone Variant

Edit Variant

Activate

Suspend

Archive

Delete (soft)

----------------------------------------------------
ATTRIBUTE INTEGRATION
----------------------------------------------------

Consume IP-004.

Do NOT recreate attribute engine.

Variant attributes are selected from existing Attribute Definitions.

Users choose attribute values.

Example

Storage

256GB

Colour

Black

RAM

16GB

----------------------------------------------------
SEARCH
----------------------------------------------------

Search by

Variant Code

Variant Name

Parent Product

Status

Attributes

----------------------------------------------------
TIMELINE
----------------------------------------------------

Create events

VARIANT_CREATED

VARIANT_UPDATED

VARIANT_CLONED

VARIANT_ARCHIVED

VARIANT_ACTIVATED

VARIANT_SUSPENDED

ATTRIBUTE_OVERRIDE_UPDATED

----------------------------------------------------
AUDIT
----------------------------------------------------

Track

Parent Product

Variant Name

Variant Code

Status

Attribute overrides

Clone operations

----------------------------------------------------
INDUSTRY EXPERIENCE
----------------------------------------------------

ENG-003k controls terminology.

Retail

Variants

Healthcare

Service Options

Banking

Product Options

Property

Unit Types

Education

Course Levels

Internally everything remains Product Variant.

----------------------------------------------------
UX
----------------------------------------------------

Follow platform standards

PlatformWorkspaceHeader

PlatformTabs

PlatformCompletionCard

PlatformSearchState

PlatformActionResult

PlatformProcessingButton

Sticky Action Bar

Unsaved Changes Guard

Confirmation Dialogs

Platform Empty State

----------------------------------------------------
QUALITY
----------------------------------------------------

Must pass

TypeScript

ESLint

Production Build

Create

scripts/bp003-ip005-product-variants-smoke-validation.ts

----------------------------------------------------
DOCUMENTATION
----------------------------------------------------

Update

IP-005 document

Build Pack scope

Architecture references

----------------------------------------------------
IMPORTANT
----------------------------------------------------

Do NOT implement

Pricing

Inventory

Tax

These belong to future Build Packs.

Only build the Variant Engine.

----------------------------------------------------
STOP POINT
----------------------------------------------------

Stop after IP-005.

Return implementation handover using the standard format:

1. Files Created

2. Files Modified

3. Database Schema

4. Business Rules

5. Architecture

6. UI Components

7. Manual Verification

8. Quality Gates

9. Future Integration