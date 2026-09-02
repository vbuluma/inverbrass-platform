# BP-009 Navigation Hub — Information Architecture

| Attribute | Definition |
|-----------|------------|
| Build Pack | BP-009 Procurement & Supplier Management |
| Architecture baseline | AV-1.12 (sourcing IP boundary) / AV-1.11 (Procurement hub IA lock) / AV-1.10 (ownership lock) |
| Governs | Runtime navigation for BP-009, starting at IP-01 |
| Status | **Locked** — hub registered; Suppliers, Purchase Requests, and Sourcing (RFX / Evaluations / Awards) are live views |
| Navigation framework | Existing platform shell (IP-007 / NAV-001). No second navigation system |
| Runtime today | `platform-nav-config.ts` exposes Procurement → Suppliers, Purchase Requests, Sourcing → RFX, Evaluations, Awards. Evaluations and Awards are filtered lists of the same sourcing events, not separate engines. |

This document is the canonical information architecture for Procurement navigation. Build Packs and IPs are internal delivery boundaries. They must never appear in operational navigation.

---

## 1. Navigation principle

BP-009 follows the platform's approved **hub-first** architecture.

The user navigates by **business job / capability**, not by Build Pack or IP:

```text
Business Hub
    ↓
Capability Group
    ↓
Operational Capability
    ↓
Record / Action
```

Never:

```text
BP-009
   ↓
IP-01
IP-02
IP-03
...
```

---

## 2. Procurement as the business hub

BP-009 introduces **Procurement** as a primary desktop business hub.

Approved primary navigation (AV-1.11):

```text
Dashboard
Parties
Offerings
CRM
Sales
Payments
Inventory
Procurement
Settings
```

Procurement sits after Inventory and before Settings, matching the established buy-side workflow. It remains a **single hub**.

Do **not** create these as top-level primary navigation peers:

```text
Suppliers
RFQs
Purchase Requests
Purchase Orders
Contracts
Supplier Performance
```

They belong under Procurement.

---

## 3. IP-01 exposed navigation

Only IP-01 is in scope for the first runtime increment. Do not expose future functionality as if it already exists.

```text
Procurement
└── Suppliers
```

User journey:

```text
Procurement
      ↓
Suppliers
      ↓
Supplier List
      ↓
Supplier Profile
```

Do not create empty, disabled, or fake navigation items for unimplemented IPs.

---

## 4. Target information architecture (future)

The navigation model must accept later BP-009 capabilities without restructuring the hub.

```text
Procurement
│
├── Suppliers
│
├── Sourcing
│   ├── Purchase Requests
│   ├── RFIs
│   ├── RFQs
│   ├── RFPs
│   └── Other RFXs
│
├── Purchasing
│   └── Purchase Orders
│
├── Contracts
│
├── Receiving
│   └── Handoff to Inventory
│
├── Supplier Invoices
│
├── Supplier Performance
│
└── Analytics
```

This is the **target IA**, not IP-01 functionality. Expose a capability only when its implementation exists.

Progressive growth:

| Increment | Exposed tree |
|-----------|----------------|
| IP-01 | Procurement → Suppliers |
| After RFX | + Sourcing (Purchase Requests remain a sibling; RFX / Evaluations / Awards under Sourcing) |
| After PO | + Purchasing → Purchase Orders |
| Mature | + Contracts, Receiving, Supplier Invoices, Supplier Performance, Analytics |

---

## 5. Routes (IP-01)

Follow the Inventory pattern: nest operational routes under the hub. Do **not** introduce a top-level `/suppliers` route (CRM's `/customers` is a historical exception, not a pattern to copy).

| Route | Purpose |
|-------|---------|
| `/procurement` | Procurement hub landing |
| `/procurement/suppliers` | Supplier list / find |
| `/procurement/suppliers/new` | Add supplier (Party find/create → procurement profile) |
| `/procurement/suppliers/[id]` | Supplier Profile workspace |

Shared chrome prefixes must include `/procurement` so the business-app shell applies.

---

## 6. Procurement hub landing (IP-01)

Procurement has a useful hub landing page. It is **not** the supplier-management workspace.

The hub answers: *Where do I go to perform procurement work?*

The supplier workspace answers: *What do I need to know or do about this supplier?*

IP-01 landing is lightweight. Use `PlatformHubSections` and existing hub patterns (CRM / Inventory). Do not invent a second layout system.

```text
Procurement

Procurement Overview
---------------------------------
Suppliers
[ Active Suppliers ]
[ Preferred Suppliers ]
[ Pending Qualification ]
[ Restricted ]

Primary Actions
[ Find Supplier ]
[ Add Supplier ]

Supplier Management
[ Suppliers ]

Recent Activity
---------------------------------
(only if IP-01 audit/activity data exists)
```

Show only metrics that can be calculated from implemented IP-01 data (procurement profile status / qualification / preferred). Do **not** invent PO counts, spend, on-time delivery, or performance scores.

---

## 7. Supplier navigation

Within Procurement:

```text
Procurement
└── Suppliers
    ├── Supplier List
    └── Supplier Profile
```

Supplier Profile contains IP-01 capabilities. Do **not** create separate sidebar entries for Qualification, Categories, Capabilities, Blacklisting, Preferred Suppliers, or Supplier Eligibility.

```text
Supplier Profile
│
├── Overview
├── Qualification
├── Categories & Capabilities
├── Documents
└── Activity
```

Overview must answer, without dumping every attribute:

```text
Who is the supplier?
Are they active?
Are they qualified?
What do they supply?
Are they eligible?
```

Detail is progressively disclosed in the profile sections.

---

## 8. Supplier Profile relationship to Party

Preserve the distinction:

```text
Parties
    ↓
Party Master
    ↓
Supplier Role
    ↓
Procurement Profile
```

The Procurement supplier profile does **not** replace the Party.

Required navigation both ways:

```text
Procurement → Suppliers → Supplier Profile → View Party → Party Profile
```

```text
Parties → Party Profile → Supplier / Procurement information
```

(where the existing Party workspace can surface a procurement-profile link without duplicating master-data screens).

Do not duplicate Party identity, contacts, addresses, or organisation screens inside Procurement.

---

## 9. Boundary rules (navigation ownership)

| Domain | Owner | Procurement must not |
|--------|-------|----------------------|
| Party / customer-supplier identity | Parties (BP-002) | Duplicate Party Master |
| Customer relationships | CRM | Duplicate supplier profiles or add supplier work to CRM |
| Sell-side quotations / orders | Sales / CRM | Place RFX or buy-side quotes under CRM or Sales |
| Inventory on-hand / receiving stock | Inventory (BP-008) | Own inventory receiving or write on-hand |
| Customer AR / receipts | Payments (BP-007) | Create Pay Supplier / AP Payments in IP-01 |

Buy-side vs sell-side:

```text
Sales      → Customer → Quotation → Sales Order
Procurement → Supplier → RFX → Award → Purchase Order → Contract
```

Future receiving (not IP-01):

```text
Procurement → Receiving → Handoff → Inventory → Receiving
```

Future invoices (not IP-01):

```text
Procurement → Supplier Invoice → Payment obligation / AP process → Payments / Accounting
```

IP-01 must not implement receiving or supplier payments, and must not add those navigation items.

---

## 10. Mobile navigation

Use the existing mobile architecture. Do not create a dedicated Procurement mobile framework.

```text
Dashboard
CRM
Sales
Payments
More
```

Procurement is accessible through **More → Procurement**, the same pattern as Inventory and Parties.

Do **not** add Procurement to the mobile bottom bar simply because it is a new hub. Mobile priority remains: frequent daily jobs first; secondary business capabilities under More.

---

## 11. Labels

Use operational language in the customer/staff UI.

| Correct | Incorrect |
|---------|-----------|
| Procurement | BP-009 |
| Suppliers | IP-01, Supplier Foundation, Procurement Foundation |
| Qualification | PROC-025, Eligibility Engine |
| Categories / Capabilities | Supplier Master Engine |
| Preferred / Blacklisted | Internal status codes as labels |

Internal identifiers may exist in code, tests, and documentation. They must not appear in operational UI.

---

## 12. Permissions and tenant isolation

Seeing the Procurement hub does **not** mean the user can perform every procurement action.

Apply permissions at capability / action level using the **existing** authorization model. Do not invent a second navigation permission framework.

Example:

- View Supplier — may be available
- Edit Supplier, Manage Qualification, Blacklist Supplier, Set Preferred — may require additional permissions

Where the existing model supports conditional visibility, do not expose actions the user cannot perform.

All reads and writes remain tenant/business isolated through the existing business context. Navigation must not leak another business's procurement records.

---

## 13. Shared platform files (IP-01 merge)

Navigation registration is shared platform infrastructure. Feature implementation must not fork a local nav list.

When IP-01 pages exist, Integration Manager applies the delta on `develop` to:

| File | Change |
|------|--------|
| `03-platform/src/lib/navigation/platform-nav-config.ts` | Add `procurement` hub (`href: /procurement`) with child `suppliers` (`href: /procurement/suppliers`). Insert after Inventory, before Settings. Do **not** set `mobilePrimary`. |
| `03-platform/src/lib/navigation/business-app-routes.ts` | Add `/procurement` to `BUSINESS_APP_PREFIXES` |
| `03-platform/src/lib/navigation/breadcrumb-utils.ts` | Labels for `procurement` and `suppliers`; hub crumb if needed |
| `03-platform/scripts/platform-navigation-ia-certification.ts` | See §16 certification checks |

Until those pages exist, leave runtime navigation unchanged. Empty hub items are forbidden.

Reuse:

- `PlatformSidebar` / `PlatformMobileBottomNav` (no second framework)
- `PlatformHubSections` for the hub landing
- Existing Party workspace for identity; link rather than copy

Suggested icon: `TruckIcon` or equivalent Lucide icon not already used as a primary hub mark. Label remains **Procurement**.

---

## 14. Navigation acceptance criteria (IP-01)

| ID | Criterion |
|----|-----------|
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
| NAV-015 | Procurement is accessible through the existing mobile navigation pattern (More) |
| NAV-016 | Navigation respects existing permissions |
| NAV-017 | Navigation respects tenant/business isolation |
| NAV-018 | Existing navigation hubs remain intact |
| NAV-019 | No duplicate top-level Procurement/Supplier navigation exists |
| NAV-020 | Procurement can later accommodate RFX → Award → PO → Contract → Receiving → Invoice → Performance without another IA redesign |

---

## 15. Final acceptance gate

Before declaring IP-01 complete, confirm:

```text
✓ Procurement is a business hub
✓ Suppliers is under Procurement
✓ Supplier Profile contains IP-01 functionality
✓ Customer/Party master remains under Parties
✓ Supplier is not duplicated in CRM
✓ Procurement does not modify Inventory navigation ownership
✓ Procurement does not modify Payments ownership
✓ Procurement does not modify Sales ownership
✓ No IP is exposed in navigation
✓ No future unimplemented capability is exposed
✓ Mobile navigation follows existing architecture
✓ Permissions are preserved
✓ Tenant isolation is preserved
✓ Navigation is progressive and uncluttered
✓ Future RFX → PO → Contract → Receiving → Invoice → Performance can fit naturally
✓ No second navigation framework created
```

Inspect the **rendered / configured** navigation, not only this document.

Expected IP-01 runtime:

```text
Dashboard
Parties
Offerings
CRM
Sales
Payments
Inventory
Procurement
  └── Suppliers
Settings
```

Do not add Suppliers, RFQs, RFPs, RFX, Purchase Orders, Contracts, or Supplier Performance as top-level items.

---

## 16. Certification checks to add at IP-01 runtime

Extend `scripts/platform-navigation-ia-certification.ts` when the hub is registered:

- `PRIMARY_HUB_IDS` includes `procurement` after `inventory` and before `settings`
- Hub label is `Procurement`, href `/procurement`
- Child `suppliers` href is `/procurement/suppliers`; label `Suppliers`
- No primary hub id/label `suppliers`
- Forbidden top-level ids include sourcing/purchasing/contracts/receiving/invoices/performance/analytics procurement items
- `/procurement` is in `BUSINESS_APP_PREFIXES`
- Mobile primary remains `dashboard,crm,sales,payments`
- Config labels contain no `IP-`, `BP-009`, or `PROC-`

---

## 17. Core user experience

The user should experience:

```text
"I need to buy something"
        ↓
Procurement
        ↓
"I need to find/manage a supplier"
        ↓
Suppliers
        ↓
"I need to understand this supplier"
        ↓
Supplier Profile
        ↓
Party information + Procurement information
```

The user should never need to understand `BP-009`, `IP-01`, or `PROC-*` to perform their work.
