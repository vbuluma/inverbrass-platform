BP-003 IP-011 – Pricing & Pricing Rules

> **Implementation status (AV-1.5):** Complete. Pricing is implemented as a **reusable platform capability** (`pricing_catalogue`, `pricing_item`, `pricing_method`). BP-003 consumes it for offerings via the Product Workspace **Pricing** tab. Commercial rules (discounts, promotions, taxes) are deferred to future Build Packs.

This is one of the most important IPs because pricing should never be stored directly on the Product/Offering. The Offering defines what it is, while Pricing defines how it is sold.

Objective

Create a configurable pricing engine that supports multiple prices, currencies, channels, customer segments, regions, taxes, effective dates, and pricing rules without changing the master offering.

Business Objectives
ID	Requirement
BR-001	Support unlimited price lists per offering.
BR-002	Support multiple currencies.
BR-003	Support multiple customer segments.
BR-004	Support effective and expiry dates.
BR-005	Support future pricing without affecting current pricing.
BR-006	Support configurable pricing strategies.
BR-007	Support industry-specific pricing models.
BR-008	Keep offering master independent from pricing.
Functional Requirements
FR	Requirement
FR-001	Create price lists.
FR-002	Assign prices to offerings.
FR-003	Support multiple currencies.
FR-004	Support region-specific pricing.
FR-005	Support channel-specific pricing.
FR-006	Support customer-segment pricing.
FR-007	Support promotional pricing.
FR-008	Support effective and expiry dates.
FR-009	Activate/deactivate pricing.
FR-010	Display pricing history.
FR-011	Search pricing records.
FR-012	Compare prices across channels or regions.
Pricing Models

Examples:

Model	Example
Fixed Price	KES 500
Variable Price	Market rate
Tiered Price	1–10 = 100, 11–50 = 90
Subscription	Monthly
Usage Based	Per API call
Time Based	Per Hour
Rental	Per Day
Interest Rate	Loan Products
Premium Rate	Insurance
Consultation Fee	Healthcare
Pricing Dimensions

Pricing may vary by:

Currency
Country
Region
Branch
Customer Segment
Channel
Industry
Effective Date
Quantity Tier
Database
price_list

Defines pricing catalogues.

Examples:

Retail
Wholesale
Corporate
VIP
Internal
offering_price

Stores actual prices.

Fields include:

Offering
Price List
Currency
Unit Price
Minimum Price
Maximum Price
Effective From
Effective To
Status
Business Rules
Rule	Description
Unlimited prices per offering.	
Only one active price for the same dimension combination.	
Future prices allowed.	
Expired prices are read-only.	
Archived offerings cannot receive new prices.	
Price history is immutable.	
UI

New Workspace Tab:

Pricing

Sections:

Active Prices
Future Prices
Expired Prices
Price History

Actions:

Add Price
Edit
Activate
Expire
Copy Price
Compare Prices
Search

Support:

Offering
Currency
Price List
Channel
Region
Customer Segment

Use the standard PlatformSearchState.

Timeline

Publish events:

Price Created
Price Updated
Price Activated
Price Expired
Price Archived
Audit

Track:

Create
Edit
Activate
Expire
Delete (logical only)
Future Integration

This IP becomes the foundation for:

Sales
POS
Quotation Engine
Billing
Subscription Billing
Loan Interest
Insurance Premiums
Promotions
Discounts
Revenue Analytics
Architectural Recommendation

This is one area where I'd make a small enhancement before Cursor builds it.

Instead of naming the tables price_list and offering_price, I'd make them generic platform assets because pricing won't only be used by products. It will eventually price:

Products
Services
Room bookings
Hospital procedures
School fees
Memberships
Loans
Insurance policies

A more future-proof model would be:

pricing_catalogue
pricing_item

or

pricing_scheme
pricing_scheme_item

Then BP-003 simply consumes the Pricing Engine rather than owning it. This keeps the engine reusable across every vertical while preserving the clean separation you've been building throughout the platform.

CURSOR PROMPT
You are implementing BP-003 IP-011 – Offering Pricing & Pricing Rules.

IMPORTANT

This is IP-011 ONLY.

DO NOT implement:

- Discounts
- Promotions
- Quotation Engine
- Billing
- POS
- Revenue Recognition
- Tax Engine
- Loan Interest Calculations
- AI Pricing
- Approval workflows

Only implement the Offering Pricing capability.

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

Reuse platform engines

ENG-003a Configuration Engine

ENG-003b Localization & Regulatory Engine

ENG-004 Rules Engine

ENG-013 Audit Engine

ENG-016 Search Engine

Product Timeline Engine

====================================================
ARCHITECTURE
====================================================

Pricing is a PLATFORM capability.

This IP implements the Offering Pricing module by consuming the platform pricing architecture.

DO NOT store prices directly in the offering/product table.

====================================================
OBJECTIVE
====================================================

Provide configurable pricing for offerings.

Support

Products

Services

Variants

Bundles

Subscriptions

Loan Products

Insurance Products

Medical Services

Offerings

Future offerings

====================================================
DATABASE
====================================================

Create migration

0036_bp003_ip011_offering_pricing.sql

Create

pricing_catalogue

Fields

id

business_id

code

name

description

currency_code

status

effective_from

effective_to

metadata

----------------------------------------------------

Create

pricing_item

Fields

id

business_id

offering_id

pricing_catalogue_id

unit_price

minimum_price

maximum_price

pricing_method

customer_segment

sales_channel

region

effective_from

effective_to

status

metadata

created_at

updated_at

deleted_at

====================================================
PRICING METHODS
====================================================

Seed configurable pricing methods

FIXED

VARIABLE

TIERED

SUBSCRIPTION

USAGE

TIME_BASED

RENTAL

INTEREST_RATE

PREMIUM

CONSULTATION

Do NOT hardcode.

====================================================
BUSINESS RULES
====================================================

Unlimited pricing catalogues.

Unlimited prices per offering.

Only one ACTIVE price per

Offering

Catalogue

Currency

Customer Segment

Channel

Region

Effective Period

Future pricing supported.

Expired pricing is read-only.

Archived offerings cannot receive new pricing.

Price history is immutable.

====================================================
MODULE LAYER
====================================================

Create

repositories

pricing-catalogue-repository.ts

pricing-item-repository.ts

validators

pricing-validators.ts

services

pricing-service.ts

pricing-rules.ts

actions

pricing-actions.ts

====================================================
UI
====================================================

Enable Product Workspace tab

Pricing

====================================================
PRICING TAB
====================================================

Sections

Active Prices

Future Prices

Expired Prices

Price History

Actions

Add Price

Edit

Activate

Expire

Copy

Archive

Compare

====================================================
SEARCH
====================================================

Use PlatformSearchState

Searching

No Results

Retry

Error

Search by

Offering

Catalogue

Currency

Customer Segment

Region

Sales Channel

====================================================
DASHBOARD
====================================================

Display

Active Prices

Future Prices

Expired Prices

Pricing Catalogues

Quick Actions

====================================================
TIMELINE
====================================================

Publish

Price Created

Price Updated

Price Activated

Price Expired

Price Archived

====================================================
AUDIT
====================================================

Track

Create

Update

Activate

Expire

Archive

====================================================
VALIDATION
====================================================

Prevent

Duplicate active pricing

Overlapping effective dates

Negative prices

Maximum price less than minimum price

Expired effective dates

Invalid pricing method

====================================================
DOCUMENTATION
====================================================

Update

Build Pack 003 Scope

IP-011 document

Platform Module Catalogue

State clearly

Pricing is implemented as a reusable platform capability.

BP-003 consumes it for Offerings.

====================================================
SMOKE TEST
====================================================

Create

bp003-ip011-offering-pricing-smoke-validation.ts

Validate

Create catalogue

Create price

Future price

Activate

Expire

Duplicate prevention

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

Stop after IP-011.

DO NOT begin IP-012.
One refinement I strongly recommend before Cursor implements it

Since your platform is intended to serve banks, hospitals, schools, property managers, NGOs, retailers, and SMEs, I would not call the workspace tab "Pricing" alone.

Use two logical sections:

Pricing (base prices)
Commercial Rules (future IPs: discounts, promotions, commissions, markups, taxes, eligibility)

This means IP-011 only builds the Pricing section, while later Build Packs can extend the Commercial Rules section without redesigning the workspace. It keeps the architecture cleaner and aligns with enterprise systems