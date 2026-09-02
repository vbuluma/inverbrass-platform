I compared the supplied IP-01 specification against the broader BP-009 requirements we just established. The existing draft is **architecturally strong and safe**, especially around the BP-002 supplier boundary, tenant isolation, audit, status model, and keeping transactions out of IP-01.

However, I would make IP-01 **simpler and more useful operationally**. In particular, I would avoid making it a mini supplier-master/KYC module. It should establish the **procurement relationship and eligibility foundation** that every subsequent IP can rely on.

Below is the version I recommend freezing.

# BP-009 IP-01 — Procurement Foundation & Supplier Relationship

Navigation for this increment is locked in [BP-009 Navigation Hub](./BP-009%20Navigation%20Hub.md) (AV-1.11 / AV-1.12). IP-01 introduced **Procurement → Suppliers**. Later IPs nest Purchase Requests and Sourcing under the same hub. Do not add top-level Suppliers, RFX, PO, receiving, or payment navigation. Empty hub items remain forbidden until pages exist.

## 1. Purpose

IP-01 establishes the foundation for procurement within BP-009 by connecting an existing **BP-002 Party** with a procurement relationship.

It answers four fundamental questions:

> **Who can we procure from? What can they supply? Are they currently eligible? Why are they eligible or restricted?**

It provides the supplier procurement profile, classification, qualification status, procurement status, documents/evidence references, and common supplier eligibility service required by subsequent BP-009 IPs.

It **does not create a second supplier master**.

The core relationship is:

```text
BP-002 Party
      │
      │ Supplier Role
      ↓
BP-009 Procurement Profile
      │
      ├── Categories / Capabilities
      ├── Qualification
      ├── Procurement Status
      ├── Preferred Status
      ├── Procurement Terms
      └── Evidence / Documents
```

This preserves the existing principle that the Party remains the legal/commercial identity while BP-009 owns the procurement relationship.

---

# 2. What IP-01 should achieve

After IP-01, the platform should be able to:

1. Find an existing Party.
2. Make that Party procurement-capable through BP-002.
3. Create a procurement profile.
4. Classify what the supplier can provide.
5. Record qualification.
6. Record procurement eligibility/status.
7. Mark a supplier as preferred where authorised.
8. Suspend or restrict a supplier.
9. Record blacklisting information.
10. Maintain supporting evidence/documents.
11. Provide a simple **"Can we procure from this supplier?"** eligibility check.
12. Provide supplier information to subsequent RFX/PO/Contract IPs.
13. Maintain complete history and audit.

That is the real foundation.

---

# 3. Supplier Registration — Keep It Simple

The user journey should be:

```text
Procurement          ← business hub (not a top-level "Suppliers" hub)
   ↓
Suppliers            ← only IP-01 capability under the hub
   ↓
Add Supplier
   ↓
Find existing Party
   ↓
Select / Create Party
   ↓
Confirm Supplier Role
   ↓
Procurement Profile
   ↓
Categories + Capabilities
   ↓
Qualification
   ↓
Activate
```

See [BP-009 Navigation Hub](./BP-009%20Navigation%20Hub.md) for hub vs workspace, routes, mobile, and NAV-001–NAV-020.

The user should **not** experience:

```text
Create Supplier
→ Create Supplier Name
→ Create Supplier Address
→ Create Supplier Contacts
→ Create Supplier Tax ID
```

because those belong to BP-002.

The supplied specification correctly makes this distinction.

---

# 4. Procurement Profile

The profile should contain only procurement-specific information.

### Core


| Field                  | Requirement        |
| ---------------------- | ------------------ |
| Procurement Profile ID | System generated   |
| Party ID               | Mandatory          |
| Business/Tenant ID     | Mandatory          |
| Procurement Status     | Mandatory          |
| Qualification Status   | Mandatory          |
| Categories             | One or more        |
| Supply Capabilities    | One or more        |
| Preferred              | Yes/No             |
| Approved               | Yes/No/configured  |
| Default delivery terms | Optional           |
| Default payment terms  | Optional reference — **supplier-master default string only**. Not the RFX financial-proposal milestone schedule (IP-04). |
| Onboarding provenance  | Optional later: method (e.g. Prequalification, OEM Seconded, Direct Registration, Invitation, Existing Supplier, Other), date, by, reference, notes. **Not** an evaluation score. |
| Expected lead time     | Optional           |


The existing draft's profile attributes are broadly correct.

---

# 5. Supplier Categories & Capabilities

This should be **configuration-driven**.

For example:

```text
Supplier Type
├── Goods
├── Services
├── Assets
└── Mixed
```

Then:

```text
Category
├── IT Hardware
├── Software
├── Professional Services
├── Construction
├── Office Supplies
├── Logistics
└── ...
```

And potentially:

```text
Capability
├── Supply
├── Installation
├── Maintenance
├── Consulting
├── Managed Service
└── ...
```

A supplier can have multiple categories and capabilities.

The existing specification already establishes this configuration-driven principle.

### Innovation/simple principle

Don't create a complicated supplier taxonomy engine.

Start with:

```text
Category
+
Capability
```

and let later RFX logic query it.

---

# 6. Qualification

Qualification should answer:

> **Has this supplier met the requirements to participate in procurement?**

Keep it lightweight.

```text
Qualification
├── Type
├── Checklist
├── Documents/Evidence
├── Reviewer
├── Outcome
├── Effective Date
├── Expiry Date
└── Review Date
```

Possible outcomes:

```text
Pending
Qualified
Conditional
Failed
Expired
```

The existing document correctly keeps KYC/identity ownership outside BP-009 and consumes the existing document/identity engines.

---

# 7. Procurement Status

I recommend retaining:

```text
Active
Preferred
Conditional
Suspended
Blacklisted
Inactive
```

But there is an important refinement.

### Separate status from qualification

Do **not** make:

```text
Qualified = Active
```

They answer different questions.

Example:

```text
Supplier
Status: Active
Qualification: Qualified
```

or:

```text
Supplier
Status: Active
Qualification: Conditional
```

or:

```text
Supplier
Status: Suspended
Qualification: Qualified
```

This gives later IPs much better control.

---

# 8. Eligibility Engine — The Most Important Addition

I would strengthen the original IP-01 with a simple **supplier eligibility service**.

Every later procurement transaction should be able to ask:

```text
Is supplier X eligible for procurement?
```

And receive something conceptually like:

```text
Eligible: YES

Status: Active
Qualification: Qualified
Category: IT Hardware
Preferred: YES
Restrictions: None
```

Or:

```text
Eligible: NO

Status: Blacklisted
Reason: Contractual breach
Effective: 2026-08-01
```

Or:

```text
Eligible: NO

Qualification: Expired
Review required
```

This is much more valuable than simply storing a status.

The current specification already requires later IPs to consume a status query.

I would make that an explicit **IP-01 contract**.

---

# 9. Preferred Supplier

IP-01 should support the **state**, but not the sophisticated scoring engine.

For example:

```text
Preferred = YES
```

may be manually/governance controlled.

Later:

```text
IP-11 Supplier Performance
        ↓
Performance Score
        ↓
Preferred Supplier Recommendation
```

This keeps responsibilities clean.

The current specification already makes this distinction.

---

# 10. Blacklisting

IP-01 should establish the **status model and data structure**, but the complete governance workflow belongs in IP-11.

For now:

```text
Status = Blacklisted

Reason = ...
Effective Date = ...
Authority = ...
```

The system must ensure:

```text
Blacklisted
≠
Active
≠
Preferred
```

and preserve history.

The supplied specification correctly requires the reason and auditability.

---

# 11. Supplier Documents

Do not create a BP-009 document repository.

Use:

```text
BP-009
   ↓
ENG-015
```

Documents can include:

- qualification evidence
- certificates
- licences
- insurance
- supplier declarations
- procurement documents

Identity/KYC documents remain under the appropriate BP-002/identity architecture.

This is already correctly defined in the supplied specification.

---

# 12. Hub landing vs Supplier Workspace

Keep these separate. The **Procurement hub** answers where to do procurement work. The **Supplier workspace** answers what to know or do about one supplier. Do not overload `/procurement` with the full supplier-management UI.

### Procurement hub (IP-01)

Lightweight landing at `/procurement`. Counts only from implemented IP-01 data:

```text
Procurement

[ Active Suppliers ] [ Preferred ] [ Pending Qualification ] [ Restricted ]

Primary actions: Find Supplier · Add Supplier
Supplier management: Suppliers
```

Do not show PO counts, spend, on-time delivery, or performance scores. Those belong to later IPs.

### Supplier list (`/procurement/suppliers`)

```text
Suppliers

[ Active 42 ] [ Preferred 8 ] [ Pending 5 ] [ Restricted 2 ]

Search suppliers...

Supplier              Category       Status       Qualification
----------------------------------------------------------------
ABC Technologies      IT Hardware    Preferred    Qualified
XYZ Services           Services       Active        Qualified
North Supplies         Hardware       Conditional   Conditional
```

### Supplier Profile (`/procurement/suppliers/[id]`)

IP-01 capabilities live here — not as extra sidebar modules:

```text
Supplier Profile
├── Overview
├── Qualification
├── Categories & Capabilities
├── Documents
└── Activity
```

Overview should answer: who is the supplier, are they active, are they qualified, what do they supply, are they eligible? Disclose remaining attributes in the profile sections.

Do not put Qualification, Categories, Blacklisting, Preferred, or Eligibility in the primary sidebar.

---

# 13. Party Integration

Supplier profile should have a prominent:

> **View Party**

link.

```text
Supplier Profile
       │
       ├── Procurement information ← BP-009
       │
       └── View Party → BP-002
                         ├── Identity
                         ├── Contacts
                         ├── Addresses
                         └── Organisation
```

Do not duplicate those screens.

The supplied specification is exactly right on this point.

---

# 14. Procurement Foundation IDs

IP-01 should establish the numbering mechanism needed by subsequent IPs.

Potential identifiers:

```text
Supplier Procurement Profile
PR
RFX
RFX Response
Award
PO
Contract
Receipt
Supplier Invoice
```

However:

> **IP-01 registers numbering/configuration only. It does not create live transactions belonging to later IPs.**

This is already correctly captured in the supplied specification.

---

# 15. Audit

Use ENG-013.

Audit at minimum:

```text
Supplier procurement profile created
Supplier linked to Party
Supplier category changed
Capability changed
Qualification recorded
Qualification approved
Qualification expired
Status changed
Supplier suspended
Supplier blacklisted
Supplier reactivated
Preferred status changed
Profile deactivated
```

Do not log unnecessary sensitive information.

---

# 16. Tenant Isolation

Non-negotiable:

```text
Authenticated businessId
        ↓
Procurement Profile
        ↓
All procurement queries
```

Never trust:

```text
businessId
```

supplied by the client.

Cross-business access must fail closed.

This is already correctly specified.

---

# 17. What IP-01 Does NOT Do

Keep the boundary extremely clear.


| Capability               | IP-01            |
| ------------------------ | ---------------- |
| Supplier Party           | Consume BP-002   |
| Procurement Profile      | **YES**          |
| Categories               | **YES**          |
| Capabilities             | **YES**          |
| Qualification            | **YES**          |
| Status                   | **YES**          |
| Eligibility check        | **YES**          |
| Preferred flag           | **YES**          |
| Blacklist data structure | **YES**          |
| Blacklist governance     | IP-11            |
| Supplier scoring         | IP-11            |
| RFX                      | IP-03            |
| Supplier response        | IP-04            |
| Evaluation               | IP-05            |
| Award                    | IP-05            |
| PO                       | IP-06            |
| Contract                 | IP-07            |
| Receipt                  | IP-08            |
| Invoice                  | IP-09            |
| Matching                 | IP-09            |
| Exceptions               | IP-10            |
| Performance              | IP-11            |
| Analytics                | IP-12            |
| Payment execution        | Open v1 decision |
| GL                       | BP-010           |
| Inventory                | BP-008           |


The supplied specification already has a very strong exclusion boundary; I would retain it.

---

# 18. Core Business Rules

I would retain the existing rules and add the eligibility rule.

### PRF-001

Every procurement profile must reference an existing BP-002 Party.

### PRF-002

The Party must have a Supplier or configured supplier-capable role.

### PRF-003

BP-009 must not duplicate supplier identity/master data.

### PRF-004

Only one active procurement profile per Party per business by default.

### PRF-005

Deactivation must not delete historical records.

### PRF-006

Blacklisted cannot coexist with Active or Preferred current status.

### PRF-007

Status changes require a reason.

### PRF-008

Qualification expiry preserves historical qualification records.

### PRF-009

Authenticated businessId is authoritative.

### PRF-010

IP-01 creates no procurement transactions.

### PRF-011

IP-01 cannot alter inventory, sales, payments or GL.

### PRF-012

Categories and statuses are configuration-driven.

### PRF-013

Preferred status is not the same as performance scoring.

### **PRF-014 — Supplier Eligibility**

A supplier may participate in subsequent procurement only when the supplier eligibility service determines that the supplier is eligible under the applicable procurement policy.

### **PRF-015 — Fail Closed**

If supplier status, qualification or required eligibility information cannot be resolved, subsequent procurement capabilities must not assume eligibility.

This last rule is particularly important.

---

# 19. Acceptance Criteria

I would use approximately **20 acceptance criteria**, rather than making IP-01 unnecessarily large.


| ID     | Acceptance Criterion                                                            |
| ------ | ------------------------------------------------------------------------------- |
| AC-001 | Existing BP-002 Party with Supplier role can obtain procurement profile         |
| AC-002 | Procurement profile cannot exist without Party reference                        |
| AC-003 | BP-009 does not duplicate supplier identity/contact/address master              |
| AC-004 | Supplier registration can select/create Party through BP-002                    |
| AC-005 | Only one active procurement profile exists per Party/business by default        |
| AC-006 | Supplier can have multiple categories                                           |
| AC-007 | Supplier can have multiple capabilities                                         |
| AC-008 | Qualification can be recorded with outcome and dates                            |
| AC-009 | Qualification evidence can reference ENG-015                                    |
| AC-010 | Status supports Active/Preferred/Conditional/Suspended/Blacklisted/Inactive     |
| AC-011 | Status changes require reason                                                   |
| AC-012 | Status changes are audited                                                      |
| AC-013 | Blacklisted supplier cannot be represented as Active/Preferred                  |
| AC-014 | Historical supplier records remain accessible                                   |
| AC-015 | All reads/writes are tenant scoped                                              |
| AC-016 | Cross-business access fails closed                                              |
| AC-017 | Supplier eligibility can be queried by subsequent IPs                           |
| AC-018 | Eligibility fails closed where mandatory eligibility information is unavailable |
| AC-019 | IP-01 creates no RFX/PO/receipt/invoice/payment records                         |
| AC-020 | IP-01 does not modify inventory, sales, customer payments or GL                 |

Navigation (canonical: [BP-009 Navigation Hub](./BP-009%20Navigation%20Hub.md)):

| ID | Acceptance Criterion |
|----|----------------------|
| NAV-001 | Procurement exists as a business hub |
| NAV-002 | Suppliers is underneath Procurement |
| NAV-003 | Suppliers is not a top-level primary hub |
| NAV-004 | No IP appears in navigation |
| NAV-005 | No PROC-* identifier appears in operational UI |
| NAV-006 | Supplier qualification is accessed through Supplier Profile |
| NAV-007 | Supplier categories/capabilities are accessed through Supplier Profile |
| NAV-008 | Blacklisting/preferred state is managed through Supplier Profile according to permissions |
| NAV-009 | Supplier eligibility is displayed/accessed through Supplier Profile and reusable services, not a standalone navigation module |
| NAV-010 | Procurement does not duplicate Party Master |
| NAV-011 | Procurement does not duplicate CRM |
| NAV-012 | Procurement does not duplicate Inventory |
| NAV-013 | Procurement does not duplicate Payments |
| NAV-014 | No unimplemented future Procurement capabilities are exposed as active navigation |
| NAV-015 | Procurement is accessible through the existing mobile navigation pattern |
| NAV-016 | Navigation respects existing permissions |
| NAV-017 | Navigation respects tenant/business isolation |
| NAV-018 | Existing navigation hubs remain intact |
| NAV-019 | No duplicate top-level Procurement/Supplier navigation exists |
| NAV-020 | Procurement can later accommodate RFX → Award → PO → Contract → Receiving → Invoice → Performance without another IA redesign |

These align closely with the supplied draft's existing acceptance criteria while adding the stronger eligibility concept and the locked hub-first navigation contract.

---

# 20. Final IP-01 Boundary

The simplest way to remember IP-01 is:

```text
              BP-002
           PARTY MASTER
                │
                ↓
┌─────────────────────────────────┐
│             IP-01               │
│                                 │
│  Procurement Relationship       │
│                                 │
│  • Profile                      │
│  • Categories                   │
│  • Capabilities                 │
│  • Qualification                │
│  • Status                       │
│  • Preferred                    │
│  • Eligibility                  │
│  • Evidence                     │
│  • Audit                        │
└─────────────────────────────────┘
                │
                ↓
       ┌─────────────────┐
       │ Future IPs       │
       ├─────────────────┤
       │ RFX              │
       │ Response         │
       │ Evaluation       │
       │ PO               │
       │ Contract         │
       │ Receipt          │
       │ Invoice          │
       │ Performance     │
       └─────────────────┘
```

### My recommendation

**Use the supplied specification as the baseline, but adopt this refined version.** The original is technically sound, but it contains a little too much foundation detail for what should be a simple first procurement increment. Its strongest elements—Party ownership, qualification, status, audit, tenant isolation and explicit exclusions—should remain.

The **one significant enhancement I would definitely add is the supplier eligibility contract**. It becomes the clean bridge between IP-01 and everything that follows:

```text
IP-01
Supplier Eligibility
       ↓
 ┌─────┼──────┬──────┬──────┐
RFX    PO   Contract Invoice ...
```

That gives us an innovative but simple foundation: **IP-01 doesn't try to do procurement; it makes suppliers procurement-ready and gives the rest of BP-009 one authoritative answer about supplier eligibility.**