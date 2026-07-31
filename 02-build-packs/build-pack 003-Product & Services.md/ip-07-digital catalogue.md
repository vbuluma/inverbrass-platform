IP-007 – Digital Catalogue.

This is where your Product Catalogue becomes consumable by users, customers, partners, and future channels. It exposes products without implementing sales, inventory, or pricing logic.

BP-003 IP-007 – Digital Catalogue
Objective

Provide a configurable digital catalogue that publishes products and services to different channels while respecting business, industry, and visibility rules.

This is not e-commerce. It is the presentation layer of the Product Catalogue.

Business Objectives

Support publishing to:

Internal staff
Customer Portal
Website
Mobile App
WhatsApp
QR Catalogue
Marketplace
Partner Portal
API consumers
Core Capabilities
1. Catalogue Publishing

Control whether an offering is:

Published
Unpublished
Scheduled
Archived
2. Channel Visibility

Configure where an offering appears.

Examples:

Product	Website	Mobile	WhatsApp	API
Savings Account	✓	✓	✓	✓
Internal Loan	✗	✗	✗	✓
Executive Health Package	✓	✓	✗	✓
3. Customer Visibility Rules

Support:

Public
Registered Customers
Members Only
Employees Only
Partners Only
Business Customers
Selected Customer Segments
4. Catalogue Information

Display:

Name
Description
Images
Videos
Documents
Features
Variants
Categories
Status
5. Search

Search by:

Name
Code
Category
Industry
Tags
Keywords
6. Filtering

Support filters:

Category
Product Type
Industry
Brand
Status
Availability
7. Featured Products

Allow:

Featured
Recommended
Popular
New
Seasonal
8. Catalogue Versioning

Support:

Draft Catalogue
Published Catalogue
Scheduled Release
9. QR Catalogue

Generate QR codes that open:

Product
Bundle
Service
Package
10. API Catalogue

Future channels consume the same catalogue through APIs instead of rebuilding product data.

Database
catalogue_channel

Reference data

Website
Mobile
WhatsApp
Customer Portal
Partner Portal
Marketplace
API
product_catalogue_publication

Stores publishing rules.

Field	Purpose
product_id	Product
channel_id	Channel
published	Yes/No
publish_from	Schedule
publish_to	Schedule
visibility	Public / Members etc.
Business Rules

Only:

Active products
Active variants
Active bundles

can be published.

Archived items cannot.

Drafts cannot.

Timeline

Events

Published
Unpublished
Channel Added
Channel Removed
Visibility Changed
Audit

Track:

Who published
Channel
Visibility
Schedule
Metadata changes
UI
Catalogue Dashboard

KPIs

Published Products
Draft Products
Channels
Scheduled Publications
Publication Panel

For each product:

Website

✓ Published

Customer Portal

✓ Published

WhatsApp

✗ Hidden

API

✓ Published
Preview

Preview exactly how the catalogue looks on:

Website
Mobile
WhatsApp

without leaving the application.

Industry Experience (ENG-003k)

The presentation changes by industry.

Banking

Products

Accounts
Loans
Cards
Healthcare

Services

Consultations
Procedures
Education

Courses

Programmes
Classes
Hospitality

Offers

Rooms
Packages
Property

Listings

Properties
Units
Integration

Consumes:

IP-001 Products
IP-002 Classification
IP-003 Units
IP-004 Attributes
IP-005 Variants
IP-006 Bundles

Future consumers:

CRM
Sales
Booking
Mobile App
WhatsApp
Marketplace
AI Engine

Cursor Prompt
You are implementing BP-003 IP-007 – Digital Catalogue.

IMPORTANT

This is IP-007 ONLY.

Do NOT implement:

- Shopping cart
- Checkout
- Ordering
- Payments
- Pricing calculations
- Inventory
- Promotions
- Marketplace integrations
- AI recommendations

Follow the existing InverBrass architecture exactly.

====================================================
FOUNDATION
====================================================

Reuse existing platform components.

ENG-003f Product Intelligence Engine
ENG-003k Industry Experience Engine
ENG-013 Audit Engine
ENG-016 Search Engine
Product Timeline Engine
Platform UI Standards

Consume existing modules

IP-001 Product Foundation

IP-002 Classification

IP-003 Units of Measure

IP-004 Attribute Engine

IP-005 Variants

IP-006 Bundles

No duplication.

====================================================
OBJECTIVE
====================================================

Create the Digital Catalogue Engine.

This engine publishes products and services to different channels while controlling visibility.

This is NOT e-commerce.

It is a publishing layer.

====================================================
DATABASE
====================================================

Create migration

0032_bp003_ip007_digital_catalogue.sql

Create

catalogue_channel

Fields

id

code

name

description

status

display_order

created_at

updated_at

Seed

WEBSITE

MOBILE_APP

CUSTOMER_PORTAL

PARTNER_PORTAL

WHATSAPP

QR

API

MARKETPLACE

----------------------------------------------------

product_catalogue_publication

Fields

id

business_id

product_id

channel_id

published

visibility

publish_from

publish_to

featured

recommended

metadata

created_at

updated_at

deleted_at

Unique

product_id + channel_id

====================================================
VISIBILITY
====================================================

Create configurable visibility values

PUBLIC

REGISTERED_CUSTOMERS

MEMBERS

EMPLOYEES

PARTNERS

BUSINESS_CUSTOMERS

CUSTOMER_SEGMENT

====================================================
BUSINESS RULES
====================================================

Only ACTIVE products may be published.

Archived products cannot be published.

Draft products cannot be published.

Suspended products cannot be published.

Publishing schedules must validate

publish_from < publish_to

Duplicate publication records prevented.

One publication per channel.

====================================================
MODULE LAYER
====================================================

Create

repositories

catalogue-channel-repository.ts

product-catalogue-publication-repository.ts

validators

product-catalogue-validators.ts

services

product-catalogue-rules.ts

product-catalogue-service.ts

actions

product-catalogue-actions.ts

====================================================
UI
====================================================

Create

Catalogue Dashboard

/products/catalogue

Catalogue Workspace

/products/catalogue/[productId]

Publication Panel

Product Workspace

====================================================
CATALOGUE DASHBOARD
====================================================

KPIs

Published Products

Draft Publications

Scheduled Publications

Featured Products

Channels

Search

Filters

Category

Type

Industry

Status

Visibility

====================================================
PUBLICATION PANEL
====================================================

For every channel

Website

Published

Visibility

Publish From

Publish To

Featured

Mobile App

Published

Visibility

Publish From

Publish To

Featured

Customer Portal

Partner Portal

WhatsApp

QR

API

Marketplace

====================================================
PREVIEW
====================================================

Create preview panels.

No real rendering.

Mock layouts only.

Preview

Website

Mobile

WhatsApp

QR

Customer Portal

Partner Portal

Future-ready placeholders.

====================================================
QR SUPPORT
====================================================

Generate placeholder QR metadata.

No external QR library required.

Store

qr_enabled

qr_slug

Future QR engine will consume this.

====================================================
TIMELINE
====================================================

Events

Published

Unpublished

Visibility Changed

Channel Added

Channel Removed

Featured

Schedule Changed

====================================================
AUDIT
====================================================

Track

Channel

Visibility

Publication

Schedule

Featured

====================================================
SEARCH
====================================================

Use PlatformSearchState

Searching

No Results

Retry

Error

====================================================
INDUSTRY EXPERIENCE
====================================================

Consume ENG-003k.

Display industry terminology.

Examples

Retail

Catalogue

Healthcare

Services

Banking

Products

Property

Listings

Hospitality

Offers

Education

Courses

Do not hardcode.

====================================================
ROUTES
====================================================

Create

/products/catalogue

/products/catalogue/[productId]

Integrate Product Workspace

New tab

Catalogue

====================================================
DOCUMENTATION
====================================================

Update

Build Pack 003 Scope

IP-007 document

Platform Module Catalogue

====================================================
SMOKE TEST
====================================================

Create

bp003-ip007-digital-catalogue-smoke-validation.ts

Validate

Create publication

Publish

Unpublish

Visibility

Schedules

Preview

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

Shopping Cart

Orders

Checkout

Payments

Pricing

Inventory

Marketplace APIs

Recommendation Engine

QR generation service

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

Stop after IP-007.

Do NOT begin IP-008.
One recommendation before building IP-007

Now that BP-003 is becoming substantial, I'd add one more governance rule:

Every IP should expose capabilities, not just UI.
Future verticals (Banking, Healthcare, Property, Education, etc.) should consume these capabilities through services/APIs rather than accessing the database directly.

For IP-007 specifically, think of it as exposing a Catalogue Service API:

Get Published Products
Get Product Details
Get Featured Products
Search Catalogue
Get Products by Classification
Get Products by Channel