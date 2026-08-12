---

# PRODUCT ROADMAP

## Canonical Build Pack Sequence (authoritative)

Canonical Build Pack IDs are defined in [`02-Platform-Module-Catalog.md`](./02-Platform-Module-Catalog.md).  
**CRM remains BP-004** (as implemented). Remaining packs are sequenced after it.

| Order | Build Pack ID | Name | Delivery status (2026-08-12) |
| ----- | ------------- | ---- | ---------------------------- |
| 1 | **BP-001** | Business Setup & Onboarding | ✅ Complete |
| 2 | **BP-002** | Party & Relationship Management | ✅ Complete |
| 3 | **BP-003** | Product & Service Catalogue | ✅ Complete (IP-001–IP-013; offering pricing foundation included) |
| 4 | **BP-004** | CRM & Customer Engagement | ✅ Complete (13-IP baseline; folder `Build Pack 004 - Customer Relationship Management/`) |
| 5 | **BP-005** | Pricing, Tax & Commercial Rules | ⏳ Planned (tax, discounts, promotions beyond BP-003 offering price items) |
| 6 | **BP-006** | Sales, Orders & Service Delivery | ⏳ Planned next operational focus (quotation → order/checkout/fulfilment) |
| 7 | **BP-007** | Payments, Billing & Receipting | ⏳ Planned (depends on sales transactions) |
| 8 | **BP-008** | Inventory & Resource Management | ⏳ Planned |
| 9 | **BP-009** | Procurement & Supplier Management | ⏳ Planned |
| 10 | **BP-010** | Finance & Accounting Foundation | ⏳ Planned |
| 11 | **BP-011** | Workflow & Business Process Automation | ⏳ Planned |
| 12 | **BP-012** | Analytics, AI & Decision Intelligence | ⏳ Planned |
| 13 | **BP-013** | Product Management & Innovation | ⏳ Planned |

### ID realignment (from prior catalog draft)

| Prior catalog ID / label | New canonical ID | Notes |
| ------------------------ | ---------------- | ----- |
| Pricing, Tax & Commercial Rules (old BP-004) | **BP-005** | Offering unit prices remain in BP-003 IP-011; this pack owns tax/discount/promotion policy |
| Sales, Orders & Service Delivery (old BP-005) | **BP-006** | CRM quotations stay in BP-004 IP-10; this pack owns checkout/order/fulfilment |
| Payments, Billing & Receipting (old BP-006) | **BP-007** | |
| Inventory & Resource Management (old BP-007) | **BP-008** | |
| CRM & Customer Engagement (old BP-008) | **BP-004** | Locked to implemented delivery ID — do not renumber CRM to BP-008 |

### Recommended next pack after BP-004 CRM

1. **BP-006 — Sales, Orders & Service Delivery** to close Quotation → Order → Checkout/Fulfilment, **or**  
2. **BP-005 — Pricing, Tax & Commercial Rules** first if taxed checkout is mandatory before sales go-live.

Do **not** start BP-007 Payments before a sales transaction owner exists.

---

## Refined Development Roadmap (detail)

### Release 1 — Platform Foundation

Business Goal: Enable businesses to onboard, authenticate and activate the platform.

**BP-001 Business Setup & Onboarding** — ✅ Complete

| IP | Implementation Package | Status |
| -- | ---------------------- | ------ |
| IP-001 | Project Foundation & Architecture | ✅ Complete |
| IP-002 | Database Foundation & Multi-tenancy | ✅ Complete |
| IP-003 | Business Registration & Owner Onboarding | ✅ Complete |
| IP-004 | Authentication Services & First Login | ✅ Complete |
| IP-005 | Authentication UI & Business Selection | ✅ Complete |
| IP-006 | Business Setup Wizard, Configuration & Activation | ✅ Complete |
| IP-007 | [Retired — activation merged into IP-006] | ⛔ Retired |
| IP-008 | End-to-End Testing & Release Hardening | ✅ Complete (covered by integration certification) |

---

### Release 2 — Business Operations Foundation (complete)

**BP-002 Party & Relationship Management** — ✅ Complete  
(Customer/supplier identity is a *role on Party*, not a separate customer master.)

**BP-003 Product & Service Catalogue** — ✅ Complete  
Includes categories, UoM, attributes, variants, bundles, digital catalogue, lifecycle, documents, relationships, **offering pricing (IP-011)**, analytics, governance.

**BP-004 CRM & Customer Engagement** — ✅ Complete  
Leads, opportunities, accounts, activities, calendar, visits, communications, cases, quotations (pipeline), campaigns, analytics, governance, Customer 360.

---

### Release 2b — Commercial Completion (next)

**BP-005 Pricing, Tax & Commercial Rules** — ⏳ Planned  
Tax configuration, discounts, promotions, commissions, commercial policies extending BP-003 `pricing_*` (prices remain off the product master).

**BP-006 Sales, Orders & Service Delivery** — ⏳ Planned (recommended next operational focus)  
Orders, checkout, sales transactions, returns, fulfilment beyond CRM quotation/pipeline.

**BP-007 Payments, Billing & Receipting** — ⏳ Planned  
Payment processing, split payments, receipts, credit sales, invoice settlement.

**BP-008 Inventory & Resource Management** — ⏳ Planned  
Stock, warehouses, transfers, adjustments, operational assets.

---

### Release 3 — Extended Operations & Intelligence

**BP-009** Procurement & Supplier Management — ⏳ Planned  
**BP-010** Finance & Accounting Foundation — ⏳ Planned  
**BP-011** Workflow & Business Process Automation — ⏳ Planned  
**BP-012** Analytics, AI & Decision Intelligence — ⏳ Planned  
**BP-013** Product Management & Innovation — ⏳ Planned  

---

### Delivery principles

- Build one Build Pack at a time.
- Complete design, development, testing, and approval before starting the next Build Pack.
- Reuse Core Platform capabilities wherever possible.
- Prefer configuration over customization.
- Every release shall deliver usable business value.
- Where narrative below conflicts with the **Canonical Build Pack Sequence** table, **the canonical table wins**.

---

## Historical narrative (superseded for IDs)

The following retains older product wording for context. **IDs in the canonical table above are authoritative.**

---

Release 3 — Customer Growth (historical — CRM is BP-004, already complete)

BP-009 Bookings & Appointments *(where not already covered by BP-004 calendar/visits)*
Owner
Operations Domain
•	Scheduling 
•	Calendars 
•	Availability 
•	Resources 

---

BP-010 Loyalty & Rewards
Owner
Customer Domain
•	Loyalty 
•	Points 
•	Campaigns 
•	Vouchers 

---

BP-011 Digital Catalogue & Social Commerce
Owner
Customer Domain
•	Online Catalogue 
•	WhatsApp Commerce 
•	Facebook Commerce 
•	Shareable Links 

---

Release 4 — Business Control
BP-012 Expenses & Cashbook
Finance Domain
BP-013 Receivables & Collections
Finance Domain
BP-014 Reconciliation
Finance Domain
BP-015 Dashboards & Reporting
Reporting Engine
BP-016 Notifications & Workflows
Notification Engine + Workflow Engine

---

Release 5 — Workforce & Productivity
BP-017 Workforce & Performance
BP-018 Tasks & Reminders
BP-019 Document Management
BP-020 Asset & Equipment

---

Release 6 — AI Business Advisor
BP-021 AI Business Advisor
BP-022 Business Health Monitoring

---

Release 7 — Industry Solutions
These do not rebuild core capabilities.
Instead they configure and orchestrate reusable platform capabilities.
Examples:
Industry Solution	Reuses
Retail Shop	Customer + Sales + Inventory + Finance
Restaurant	Customer + Orders + Kitchen + Finance
Salon	Customer + Scheduling + Finance
Car Wash	Customer + Vehicles + Services + Finance
Pharmacy	Customer + Inventory + Finance + Compliance
Property	Customer + Finance + Workflow + Documents
School	Customer + Scheduling + Finance
Chama	Customer + Finance + Workflow
Academy	Customer + CRM + Scheduling + Finance

---

Delivery Principles
•	Build one Build Pack at a time.
•	Complete design, development, testing, and approval before starting the next Build Pack.
•	Reuse Core Platform capabilities wherever possible.
•	Prefer configuration over customization.
•	Every release shall deliver usable business value.
.   Every Build Pack can follow the same pattern: capability ownership →   implementation packages → testing → approval → next Build Pack.

---

Senior Architect Recommendation
I would make one small enhancement. Add a simple Status column from day one. It will become your project dashboard.

| Release | Build Pack | Status |
| ------- | ---------- | ------ |
| R1 | BP-001 Business Setup & Onboarding | ✅ Complete |
| R2 | BP-002 Party & Relationship Management | ✅ Complete |
| R2 | BP-003 Product & Service Catalogue | ✅ Complete |
| R2 | BP-004 CRM & Customer Engagement | ✅ Complete |
| R2b | BP-005 Pricing, Tax & Commercial Rules | ⏳ Planned |
| R2b | BP-006 Sales, Orders & Service Delivery | ⏳ Planned (recommended next) |
| R2b | BP-007 Payments, Billing & Receipting | ⏳ Planned |
| R2b | BP-008 Inventory & Resource Management | ⏳ Planned |
| R3 | BP-009–BP-013 | ⏳ Planned |

As the project grows, this single table becomes your executive progress tracker without needing a separate project plan. It's simple, practical, and aligns with your goal of managing the project as a solo founder using AI-assisted development.



### Release 8 – Embedded Financial Services & Partner Ecosystem(Business Intelligence & Financial Ecosystem)

This becomes a strategic release rather than a feature.


| Build Pack | Name                                            | Description                                                                                                            |
| ---------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **BP-030** | Business Intelligence & Business Profile Engine | Build the trusted business profile from operational data (sales, cash flow, inventory, expenses, employees, etc.).     |
| **BP-031** | Consent & Data Sharing Engine                   | Allow SMEs to control what data is shared, with whom, for what purpose, and for how long.                              |
| **BP-032** | Finance Marketplace                             | Connect banks, SACCOs, MFIs, and fintechs to receive financing offers based on the Business Profile.                   |
| **BP-033** | Insurance Marketplace                           | Connect insurers to provide business, medical, motor, asset, and liability insurance offers.                           |
| **BP-034** | Enterprise Integration Hub (ENG-003e)              | Standard APIs/webhooks for banks, insurers, payment providers, CRBs, tax authorities, etc.                             |
| **BP-035** | AI Business Advisor                             | Recommend financing, insurance, grants, and financial products based on the Business Profile and business performance. |


---

# Why this sequence?

## BP-030 first

Before you can share anything, you need to build a trusted profile.

This pack creates:

- Business Health Score
- Cash Flow Score
- Revenue Trends
- Business Stability
- Profitability
- Employee Growth
- Customer Growth
- Inventory Turnover
- Payment Behaviour

This becomes the **source of truth**.

---

## BP-031

Now the customer owns the data.

Examples:

- Share with Equity Bank
- Share with Jubilee Insurance
- Share for 30 days
- Revoke access
- View sharing history

This is the governance layer.

---

## BP-032

Now banks plug in.

Instead of applying to banks individually:

```
Business
      │
      ▼
Business Profile
      │
      ▼
Finance Marketplace
      │
 ┌────┼────┐
 ▼    ▼    ▼
Bank A Bank B Bank C

```

Banks compete for the customer.

---

## BP-033

Exactly the same architecture.

```
Business Profile
      │
      ▼
Insurance Marketplace
      │
 ┌────┼────┐
 ▼    ▼    ▼
APA  Britam Jubilee


```

---

# How it works

## Step 1

Business uses InverBrass normally.

Every day the platform collects

- Sales
- Cashflow
- Customers
- Employees
- Inventory
- Expenses
- Profitability
- Payment behaviour
- Business growth
- Tax history
- Receipts

No extra work.

---

## Step 2

The platform builds

## Business Health Profile

Example

```
Business Score

★★★★★

Operating since
2026

Monthly Revenue

KES 680,000

Average Daily Sales

KES 24,000

Growth

18%

Expense Ratio

41%

Customer Retention

72%

Business Stability

High

Cashflow Stability

Excellent

Payment Reliability

Excellent
```

Notice

No bank statement uploads.

Everything comes from the platform.

---

# Step 3

Business wants financing.

Instead of filling 20 forms

They click

```
Finance Marketplace
```

---

System asks

```
Share your Business Profile?

✓ Revenue

✓ Cashflows

✓ Inventory

✓ Employees

✓ Tax Summary

✓ Business Score
```

---

Then

Choose institutions

```
☐ Equity

☐ KCB

☐ Cooperative

☐ NCBA

☐ Absa

☐ Stanbic
```

Click

```
Share
```

---

# Step 4

Banks receive

NOT raw database tables.

Instead

A standardized profile.

Example

```
Business ID

Industry

Revenue

Growth

Risk Score

Cashflow Stability

Operating Months

Existing Loans

Business Health Score

Supporting Documents
```

Exactly the same format.

Every bank.

---

# Step 5

Banks evaluate.

Then send offers.

```
Equity

KES 750,000

12%

36 Months

Accept
```

---

```
KCB

KES 900,000

13%

48 Months

Accept
```

---

```
Co-op

KES 600,000

10.8%

24 Months

Accept
```

The business compares.

Chooses one.

---

# Insurance works exactly the same

Business clicks

```
Insurance Marketplace
```

Share

```
Business Assets

Equipment

Revenue

Employees

Branches

Industry

Risk Profile
```

Insurers return

```

```

```
Britam

KES 18,000/year
```

---

```

```

```
Jubilee

KES 16,200/year
```

---

```

```

```
APA

KES 15,700/year
```

Business buys.

## BP-034

This becomes your integration engine.

Every partner connects once.

You don't hard-code integrations into each module.

---

## BP-035

Now AI becomes useful.

Instead of saying

> "Here are loans."

AI says

> "Based on your last 18 months of revenue, improving cash flow, and low debt ratio, you qualify for inventory financing up to KES 2 million. Three lenders currently have suitable offers."

That is far more valuable.

---

## I think this fits perfectly with your long-term vision

Your roadmap would evolve naturally:

- **Release 1–4:** Get businesses operating (onboarding, sales, payments, inventory, CRM).
- **Release 5–7:** Deepen business operations (industry-specific capabilities, analytics, automation, AI).
- **Release 8:** Monetize the ecosystem by introducing the **Business Profile Exchange**, consent management, finance, insurance, and partner marketplaces.

This keeps BP-001 focused and lightweight while reserving one of the platform's biggest competitive advantages for a dedicated strategic release. I would make **BP-030: Business Intelligence & Business Profile Engine** the cornerstone of that release, because every other financial capability builds on it.