BP-003 IP-012 – Offering Analytics & Performance
Objective

Provide operational analytics and performance measurement for every offering, enabling businesses to understand how products and services perform without relying on external BI tools.

Business Objectives
ID	Requirement
BR-001	Measure offering performance over time.
BR-002	Display configurable KPIs for each offering.
BR-003	Compare performance across offerings.
BR-004	Support industry-specific KPIs.
BR-005	Enable management dashboards.
BR-006	Feed future AI Product Intelligence (IP-015).
Functional Requirements
FR	Requirement
FR-001	Display offering performance dashboard.
FR-002	Display configurable KPIs.
FR-003	Display trend charts.
FR-004	Compare offerings.
FR-005	Display lifecycle statistics.
FR-006	Display revenue metrics (where applicable).
FR-007	Display usage metrics.
FR-008	Display operational metrics.
FR-009	Export analytics.
FR-010	Filter by period.
Example KPIs

The engine should allow KPIs to be configurable.

Examples include:

KPI	Description
Total Sales	Number sold
Revenue	Sales value
Profit	Gross margin (when available)
Active Customers	Customers using the offering
Active Subscriptions	Subscription count
Renewals	Number renewed
Cancellations	Number cancelled
Utilization	Usage percentage
Availability	Uptime / availability
Inventory Balance	Current stock
Returns	Returned items
Claims	Insurance claims
Loan Portfolio	Outstanding balance
Patient Visits	Healthcare
Student Enrolment	Education
Occupancy	Property / Hospitality
Analytics Categories
Category	Examples
Commercial	Revenue, Sales, Margin
Operational	Utilization, Processing Time
Customer	Active Customers, Retention
Lifecycle	Draft, Active, Archived
Compliance	Missing Documents, Expired Licences
Inventory	Stock Levels
Financial	Income, Cost, Profit
Industry-specific	Loan Portfolio, Claims, Admissions
Dashboard

Workspace tab

Analytics

Sections

KPI Cards
Trends
Performance Summary
Usage
Revenue
Customer Metrics
Operational Metrics
Business Rules
Rule	Description
Analytics are read-only.	
Metrics are calculated from operational data.	
Historical data is immutable.	
KPIs are configurable by industry.	
Date filters affect calculations only.	
Database

New tables

offering_metric_definition

Defines available KPIs.

Examples

Revenue
Profit
Sales
Active Customers
offering_metric_snapshot

Stores calculated values.

Supports:

Daily
Weekly
Monthly

This avoids recalculating large datasets every time.

UI

New Product Workspace Tab

Analytics

Dashboard includes

KPI cards
Trend charts
Comparison table
Date filters
Export
Timeline

Publish events

Analytics Refreshed
KPI Updated
Snapshot Generated
Audit

Track

Manual refresh
KPI configuration changes
Future Integration

This IP becomes the data source for:

Executive Dashboards
Reporting Engine (ENG-011)
AI Engine (ENG-012)
Product Intelligence (IP-015)
Revenue Analytics
Forecasting
Capacity Planning
Cursor Prompt

At this stage, do not ask Cursor to build complex analytics calculations. Instead, have it:

Build the analytics framework.
Create KPI definitions.
Create snapshot tables.
Build dashboard UI.
Add placeholder metrics using existing data (product count, active status, lifecycle counts).
Prepare extension points for future Build Packs (Sales, Inventory, CRM, Finance) to populate real metrics.

This keeps BP-003 independent while ensuring the analytics engine is ready to grow as additional modules are implemented.

Recommendation

Since you've now completed most of the operational product management capabilities, **BP-003 freezes after IP-013 (Offering Governance)** per AV-1.5:

- **IP-013** – Offering Governance — **final BP-003 IP**
- **IP-014** – Offering Roadmap — **retired → ENG-003m Portfolio & Roadmap Engine**
- **IP-015** – Product Intelligence — **deferred → ENG-003f / BP-013**

Roadmap and AI features become more valuable once Sales, Inventory, CRM, Finance, and other Build Packs produce real operational data. This keeps delivery incremental and architecture clean.

CURSOR PROMPT
You are implementing BP-003 IP-012 – Offering Analytics & Performance.

IMPORTANT

This is IP-012 ONLY.

DO NOT implement:

- AI recommendations
- Predictive analytics
- Forecasting
- Machine Learning
- Product Intelligence (IP-015)
- Executive BI dashboards
- Workflow changes
- Pricing logic
- Inventory calculations
- Sales calculations
- Financial posting

Only implement the Analytics Framework for Offerings.

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

IP-011 Pricing

Reuse platform engines

ENG-003a Configuration Engine

ENG-003b Localization & Regulatory Engine

ENG-003f Product Intelligence Engine (foundation only)

ENG-011 Reporting Engine

ENG-013 Audit Engine

ENG-016 Search Engine

Product Timeline Engine

====================================================
OBJECTIVE
====================================================

Provide a reusable analytics framework that measures offering performance.

The framework must support

Products

Services

Variants

Bundles

Subscriptions

Loan Products

Insurance Products

Medical Services

Courses

Future offering types

The framework must NOT calculate business transactions.

It provides configurable KPI definitions, metric snapshots and dashboard presentation.

====================================================
DATABASE
====================================================

Create migration

0037_bp003_ip012_offering_analytics.sql

Create table

offering_metric_definition

Fields

id

business_id

code

name

description

metric_category

calculation_method

unit_of_measure

is_active

metadata

----------------------------------------------------

Create table

offering_metric_snapshot

Fields

id

business_id

offering_id

metric_definition_id

snapshot_period

snapshot_date

metric_value

currency_code

metadata

created_at

====================================================
METRIC CATEGORIES
====================================================

Seed configurable categories

COMMERCIAL

CUSTOMER

OPERATIONAL

LIFECYCLE

COMPLIANCE

INVENTORY

FINANCIAL

INDUSTRY_SPECIFIC

====================================================
DEFAULT KPI DEFINITIONS
====================================================

Seed definitions only.

Do NOT calculate complex values.

Examples

TOTAL_SALES

TOTAL_REVENUE

ACTIVE_CUSTOMERS

ACTIVE_SUBSCRIPTIONS

UTILIZATION

CURRENT_STATUS

TOTAL_VARIANTS

TOTAL_BUNDLES

TOTAL_DOCUMENTS

TOTAL_RELATIONSHIPS

TOTAL_PRICES

LAST_UPDATED

====================================================
BUSINESS RULES
====================================================

Analytics are read-only.

Metric definitions are configurable.

Snapshots are immutable.

Historical snapshots cannot be edited.

One snapshot per metric per period.

Support

Daily

Weekly

Monthly

====================================================
MODULE LAYER
====================================================

Create

repositories

offering-metric-definition-repository.ts

offering-metric-snapshot-repository.ts

validators

offering-analytics-validators.ts

services

offering-analytics-service.ts

offering-analytics-rules.ts

actions

offering-analytics-actions.ts

====================================================
UI
====================================================

Enable Product Workspace tab

Analytics

====================================================
ANALYTICS TAB
====================================================

Sections

Performance Summary

KPI Cards

Offering Health

Lifecycle Summary

Compliance Summary

Commercial Summary

Relationship Summary

Pricing Summary

Recent Activity

====================================================
KPI CARDS
====================================================

Create reusable PlatformKpiCard layout.

Examples

Status

Variants

Bundles

Relationships

Prices

Documents

Last Updated

Cards must be reusable across future modules.

====================================================
SEARCH
====================================================

Use PlatformSearchState.

Searching

No Results

Retry

Error

====================================================
FILTERS
====================================================

Support

Date Range

Metric Category

Snapshot Period

====================================================
EXPORT
====================================================

Add Export placeholder.

No report generation yet.

====================================================
TIMELINE
====================================================

Publish events

Analytics Refreshed

Snapshot Created

Metric Definition Updated

====================================================
AUDIT
====================================================

Track

Metric definition changes

Manual refresh

====================================================
EXTENSIBILITY
====================================================

Design this module so future Build Packs can contribute metrics.

Examples

Sales BP

Inventory BP

CRM BP

Finance BP

Hospital BP

School BP

Property BP

Transport BP

The analytics engine must accept future metrics without schema changes.

====================================================
DOCUMENTATION
====================================================

Update

Build Pack 003 Scope

IP-012 document

Platform Module Catalogue

Document that

Analytics Framework is reusable.

Actual business metrics will be populated by future modules.

====================================================
SMOKE TEST
====================================================

Create

bp003-ip012-offering-analytics-smoke-validation.ts

Validate

Metric definitions seeded

Snapshots created

Dashboard loads

KPI cards display

Analytics tab opens

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

Stop after IP-012.

DO NOT begin IP-013.

One recommendation before proceeding to IP-013: after IP-012 is complete, consider pausing BP-003 and reviewing the complete Product/Offering module end-to-end. At that point you'll have a robust foundation (master data, classification, attributes, variants, bundles, catalogue, lifecycle, compliance, relationships, pricing, and analytics).