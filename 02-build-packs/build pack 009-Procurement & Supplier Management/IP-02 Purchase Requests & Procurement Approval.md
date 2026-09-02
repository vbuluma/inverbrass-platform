Yes. I would **expand IP-02 slightly** so it handles both **planned procurement** and **ad-hoc procurement**, without turning it into a budgeting system.

The cleanest model is to introduce a simple concept of a **Procurement Plan / Procurement Demand**, sitting between the budget/need and the individual Purchase Request.

## Recommended model

```text
SOURCE OF NEED
│
├── Annual / Periodic Budget
│      ↓
│   Procurement Plan / Demand
│      ↓
│   Multiple Purchase Requests
│
└── Ad-hoc Need
       ↓
   Budget Check / Budget Approval
       ↓
   Purchase Request
       ↓
   Approval
```

The important distinction is:

> **Budget authorises spending capacity. Purchase Request authorises a specific procurement need.**

BP-009 should **consume budget information**, not become the enterprise budgeting system.

---

# 1. Add "Procurement Plan" to IP-02

I would make this a lightweight capability within IP-02 rather than creating another IP.

### IP-02 becomes

```text
IP-02 Purchase Demand, Requests & Approval
```

with three entry paths:

```text
                  ┌── Budget/System Integration
                  │
Need ─────────────┼── Batch Upload
                  │
                  └── Ad-hoc Request
                         ↓
                  Procurement Demand
                         ↓
                  Purchase Request
                         ↓
                     Approval
```

This gives you a single internal procurement pipeline.

---

# 2. Procurement Demand

A **Procurement Demand** represents something the business expects to procure.

For example, an annual budget might contain:

| Category   | Requirement | Qty | Estimated Value | Period |
| ---------- | ----------- | --: | --------------: | ------ |
| IT         | Laptops     | 100 |             15M | Q1     |
| IT         | Monitors    | 100 |              5M | Q1     |
| Facilities | Furniture   |  50 |              4M | Q2     |
| HR         | Training    |  10 |              2M | Q2     |

Instead of creating 4 separate PRs manually, the system imports these as **procurement demands**.

Then procurement can:

```text
Procurement Plan
       ↓
Review / Validate
       ↓
Approve / Activate
       ↓
Generate PRs
```

---

# 3. Three ways to create Procurement Demand

## A. Budget Integration

Preferred for mature organisations.

```text
Budgeting System
       ↓ API
BP-009
       ↓
Procurement Plan
```

The integration should bring across things such as:

```text
Budget ID
Budget line
Business unit
Cost centre
Category
Description
Approved amount
Currency
Budget period
Quantity where available
Required period
```

**Do not copy the entire budgeting system into BP-009.**

The budgeting system remains the source of truth.

BP-009 stores the necessary **budget reference/snapshot** for procurement traceability.

---

# 4. B. Batch Upload

This is essential because not every organisation will have an integration.

Provide:

```text
Download Template
       ↓
Populate Excel/CSV
       ↓
Upload
       ↓
Validate
       ↓
Preview
       ↓
Import
```

Very important:

### Never directly create procurement requests from an uploaded spreadsheet.

First create an **import batch**.

Example:

```text
Import Batch
IMP-2026-001

100 rows uploaded

✓ 94 valid
✗ 6 errors
```

User can download the errors:

```text
Row 27
Unknown cost centre

Row 41
Budget reference missing

Row 63
Quantity invalid
```

Correct and re-upload.

This is much safer.

---

# 5. C. Ad-hoc Procurement

For something not in the procurement plan:

```text
User
 ↓
New Purchase Request
 ↓
"Ad-hoc"
 ↓
Budget Reference
 ↓
Budget Validation
 ↓
Approval
```

The user should be forced to identify the budget source.

For example:

```text
Budget Source

○ Planned Procurement
○ Existing Budget
○ Ad-hoc Budget Approval
```

---

# 6. Ad-hoc Budget Requirement

This is where your requirement becomes important.

If an ad-hoc requirement has **no approved budget**, it should not simply proceed to procurement approval.

Instead:

```text
Ad-hoc Need
     ↓
Is there an approved budget?
     │
   ┌─┴──────────┐
   │            │
  YES           NO
   │            │
   ↓            ↓
PR         Budget Request
                ↓
          Budget Approval
                ↓
          Approved Budget
                ↓
               PR
```

However, **BP-009 should not build the budget approval engine**.

If the organisation has a budgeting system:

```text
BP-009 → Budgeting System
```

If there is an existing internal budget workflow, integrate with it.

If neither exists, BP-009 can record:

```text
Budget Approval Reference
Approved Amount
Approval Date
Approver
```

as evidence.

---

# 7. Budget Reservation vs Budget Validation

I would keep this distinction very clear.

### IP-02 should validate:

> "Is there sufficient approved budget for this procurement request?"

It should not necessarily **reserve/consume accounting budget** unless the platform already has a formal budget-control engine.

For example:

```text
Approved Budget:       KES 10M
Existing Commitments:  KES 6M
Available:             KES 4M

New PR:                KES 2M
```

System can show:

```text
Budget Available: KES 4M
Request:          KES 2M
Status:           Within Budget
```

But actual budget commitment should remain with the budgeting/financial system if one exists.

This avoids creating a second financial-control engine.

---

# 8. Procurement Plan → PR Generation

This is where the feature becomes powerful.

Suppose the annual plan contains:

```text
100 Laptops
100 Monitors
50 Desks
10 Training Sessions
```

Procurement can select:

```text
☑ Laptops
☑ Monitors
☑ Desks
☐ Training
```

Then:

**Create Purchase Requests**

The system generates PRs based on configurable grouping.

For example:

```text
PR-001
IT Equipment
├── 100 Laptops
└── 100 Monitors

PR-002
Office Furniture
└── 50 Desks
```

Instead of forcing one PR per budget line.

---

# 9. Simple Grouping Rules

Do not create an overly complicated procurement-planning engine.

Allow grouping by:

```text
Business Unit
Procurement Category
Required Period
Budget
```

For example:

```text
IT + Q1 + IT Equipment
       ↓
One PR
```

while:

```text
Facilities + Q2 + Furniture
       ↓
Another PR
```

Procurement can also choose:

```text
Create individually
```

when needed.

---

# 10. Procurement Plan Status

Keep it simple:

```text
Imported
Validated
Under Review
Approved
Active
Partially Converted
Fully Converted
Cancelled
```

But don't create unnecessary workflow states.

The important information is:

```text
Planned
→ Converted to PR
→ Remaining balance
```

---

# 11. Quantity and Value Tracking

This becomes particularly useful.

Example:

```text
Annual Plan

Laptops
Planned:       100
Converted PR:   60
Remaining:      40
```

Later:

```text
PR-001 → 60
```

The plan automatically shows:

```text
100 planned
60 requested
40 remaining
```

This gives procurement visibility without building a huge planning system.

---

# 12. Partial Conversion

This is important.

Do **not** force the entire planned quantity into one PR.

Example:

```text
Plan:
100 laptops

Q1:
40 laptops → PR-001

Q2:
30 laptops → PR-002

Q3:
30 laptops → PR-003
```

The system tracks:

```text
Planned       100
Requested      70
Remaining      30
```

---

# 13. Budget Amount Tracking

Likewise:

```text
Budget line:
KES 15M

PR-001:
KES 5M

PR-002:
KES 4M

Remaining:
KES 6M
```

But again, this should be **procurement tracking**, not a replacement for the financial budget ledger.

---

# 14. Budget Variance

The system should flag obvious problems.

Example:

```text
Approved budget:     KES 10M
Procurement request: KES 12M

⚠ Above approved budget by KES 2M
```

Possible outcome:

```text
Cannot proceed
```

or:

```text
Requires additional budget approval
```

depending on configuration.

Do not hard-code the organisation's financial policy.

---

# 15. Budget Line → Multiple Procurement Requests

This relationship should be supported:

```text
1 Budget Line
       ↓
1..N Procurement Demands
       ↓
1..N Purchase Requests
       ↓
1..N RFX
       ↓
1..N PO
```

This is much more realistic than:

```text
Budget → PR → PO
```

because procurement is often phased.

---

# 16. One PR → Multiple RFX/PO Later

Don't unnecessarily constrain downstream procurement.

For example:

```text
PR-001
100 laptops

       ↓

RFX-001
Dell
HP
Lenovo

       ↓

Award

60 → Supplier A
40 → Supplier B
```

Eventually:

```text
PO-001 → Supplier A
PO-002 → Supplier B
```

Your IP-02 model should therefore **not assume one PR = one supplier = one PO**.

That flexibility will be important later.

---

# 17. Procurement Plan Dashboard

A simple workspace would be very useful:

```text
Procurement
────────────────────────────────────

Procurement Plan

Planned Value       KES 120M
Requested           KES 65M
Committed*          KES 40M
Remaining           KES 55M

[Import Plan] [New Request]

────────────────────────────────────

2026 Procurement Plan

Category       Planned    Requested   Remaining
------------------------------------------------
IT             40M         25M         15M
Facilities     30M         10M         20M
Services       20M         15M          5M
Other          30M         15M         15M
```

`Committed` should only be shown if the downstream financial/procurement architecture actually supports it.

---

# 18. The User Experience Should Stay Simple

The user should not need to understand:

```text
Budget
Demand
PR
RFX
PO
Contract
```

as technical objects.

For a business user:

### Planned

```text
Procurement Plan
→ Select requirement
→ Create Request
```

### Ad-hoc

```text
Request Something
→ Tell us what you need
→ Select budget
→ Submit
```

The system handles the relationships underneath.

---

# 19. Recommended Data Relationship

Conceptually:

```text
Budget Reference
       │
       │
       ▼
Procurement Demand
       │
       ├──────────┐
       │          │
       ▼          ▼
    PR-001      PR-002
       │          │
       └────┬─────┘
            ▼
       Future RFX
            ↓
          Award
            ↓
           PO
            ↓
        Contract
            ↓
         Receipt
            ↓
    Asset / Inventory /
         Service
```

For an ad-hoc request:

```text
Ad-hoc Need
     ↓
Budget Approval Reference
     ↓
Procurement Demand
     ↓
Purchase Request
```

---

# 20. My Recommendation for IP-02 Scope

I would therefore rename the IP slightly:

> **IP-02 — Procurement Demand, Purchase Requests & Approval**

And structure it as:

```text
IP-02
│
├── A. Procurement Demand
│   ├── Budget integration
│   ├── Batch import
│   ├── Demand validation
│   ├── Procurement plan
│   └── Demand tracking
│
├── B. Purchase Requests
│   ├── Planned request
│   ├── Ad-hoc request
│   ├── Request lines
│   ├── Justification
│   ├── Required date
│   └── Supporting documents
│
├── C. Budget Control
│   ├── Budget reference
│   ├── Available budget check
│   ├── Budget variance
│   └── Additional approval reference
│
├── D. Approval
│   ├── Approval routing
│   ├── Approve
│   ├── Reject
│   ├── Return
│   └── Audit
│
└── E. Sourcing Handoff
    └── Approved PR → IP-03
```

### And explicitly exclude:

```text
Budget creation
Budget management
Budget accounting
Budget commitment ledger
RFX
Supplier response
Evaluation
Award
PO
Contract
Receiving
Invoice
Payment
GL
```

This gives BP-009 a **proper end-to-end procurement spine** without duplicating Finance or turning IP-02 into a massive planning system.

The particularly important design decision is **Procurement Demand as the lightweight bridge between an annual budget/import/integration and individual PRs**. That will let you handle both enterprise-scale annual procurement plans and simple ad-hoc SME purchases using essentially the same model.
