# BP-005 IP-06 – Commercial Resolution Snapshot & Transaction Contract

| Attribute | Description |
|-----------|-------------|
| Implementation Package | IP-06 |
| Build Pack | BP-005 – Pricing, Tax & Commercial Rules |
| Priority | Critical |
| Depends On | IP-01–IP-05 |
| Scope coverage | SC-011, SC-012 |
| Related FRs | FR-028–FR-032 |

> Filename retained as `IP-06 Commercial Resolution & Snapshot.md` for pack compatibility. Authoritative title: **Commercial Resolution Snapshot & Transaction Contract**.

---

## Objective

Provide the authoritative **commercial resolution result** and **immutable snapshot contract** that downstream transactional modules consume — so later pricing/tax/discount configuration changes cannot rewrite history, and consumers never re-query masters to reconstruct payable amounts.

---

## Scope (summary)

### Included

- Commercial resolution result contract (`CommercialResolution`)
- Immutable application-level snapshot (`CommercialSnapshot`)
- Component breakdown, provenance, currency, quantity, party/channel context
- Deterministic payable reconciliation
- Downstream consumer contract (CRM adapter / resolve → snapshot)
- Review step on `/commercial/resolve`

### Excluded

- Persisted `commercial_snapshot` table / second transactional master (BP-006+)
- Payment execution / collection (BP-007)
- Sales orders / checkout (BP-006)
- Tax compliance / remittance (IP-11)
- IP-07 Expected Commercial Amount and later IPs

---

## Document Control

| Item | Value |
|------|-------|
| Status | Implemented in `03-platform` (2026-08-12) |
| Smoke | `npx tsx scripts/bp005-ip06-commercial-resolution-snapshot-smoke-validation.ts` — **20/20 PASS** |
| Migrations | None |
| UX | `/commercial/resolve` Review step owned by IP-06 |

---

## Implementation Status

**Implemented** in `03-platform` (2026-08-12).

### Architecture flow (implemented)

```text
BP-003 → IP-01 → IP-05 → IP-03 → IP-04 → IP-02 → IP-06 CommercialResolution → CommercialSnapshot → Downstream
```

Orchestrated by `CommercialResolutionService.resolve` then `snapshot`. Downstream consumers must use the snapshot; they must not independently query `pricing_item`, tax rules, or discount rules to reconstruct commercial amounts.

### Persistence decision

**Immutable application-level value object (`CommercialSnapshot`).**

- No `commercial_snapshot` table.
- BP-006+ owns durable transactional storage when a transaction is committed.
- Downstream consumers store the snapshot payload with their own transaction record.
- **No** `drizzle/meta/_journal.json`, `src/db/schema/index.ts`, or `src/db/seed.ts` changes.

### Files created

| File | Purpose |
|------|---------|
| `03-platform/src/modules/commercial/services/commercial-resolution-service.ts` | Full pipeline resolve + snapshot freeze |
| `03-platform/src/modules/commercial/services/commercial-snapshot-rules.ts` | Integrity hash, payable reconcile, snapshot validation, deep clone |
| `03-platform/scripts/bp005-ip06-commercial-resolution-snapshot-smoke-validation.ts` | IP-06 smoke (TC-01…TC-16 + file/architecture checks) — **20/20 PASS** |

### Files modified

| File | Change |
|------|--------|
| `03-platform/src/modules/commercial/types.ts` | `CommercialResolutionRequest`, `CommercialResolution`, `CommercialSnapshot`, component view |
| `03-platform/src/modules/commercial/constants.ts` | IP-06 constants |
| `03-platform/src/modules/commercial/errors.ts` | Snapshot / resolution error codes + user messages |
| `03-platform/src/modules/commercial/index.ts` | Public IP-06 exports |
| `03-platform/src/modules/commercial/actions/commercial-resolution-actions.ts` | Finalize snapshot action for Review step |
| `03-platform/src/modules/commercial/components/commercial-resolution-workspace.tsx` | Review step freezes snapshot; payable vs payment collected |
| `03-platform/src/modules/crm/adapters/pricing-resolution-adapter.ts` | `resolveCommercialSnapshot` via IP-06 |

### Contracts

| Contract | Role |
|----------|------|
| `CommercialResolutionRequest` | Canonical resolve input (business, offering, currency, quantity, party/channel/catalogue, effectiveAt, optional in-memory tax/adjustment rules) |
| `CommercialResolution` | Authoritative resolved result: context, base price, components, payable, provenance, upstream artefacts |
| `CommercialSnapshot` | Immutable freeze (`snapshotId`, `frozenAt`, `integrityHash`, deep-copied `resolution`) |

### Downstream

```text
CommercialResolutionService.resolve(...)
        ↓
CommercialResolution
        ↓
CommercialResolutionService.snapshot(...)
        ↓
CommercialSnapshot
        ↓
CRM PricingResolutionAdapter.resolveCommercialSnapshot(...)
```

CRM continues: `QuotationService` → `PricingResolutionAdapter` → IP-01 → IP-05 → IP-06. No local pricing engine in CRM.

### UX

- `/commercial/resolve` **Review** step owned by IP-06.
- Freezes `CommercialSnapshot` on finalize.
- Distinguishes **resolved payable** (authoritative commercial amount) from **payment collected** (always out of scope / null — BP-007+).

### Quality gates

| Gate | Result |
|------|--------|
| IP-06 smoke | **20/20 PASS** |
| Lint | **PASS** |
| Typecheck | Pre-existing only: `bp001-004-system-integration-certification.ts` leads (not introduced by IP-06) |

### Intentional gaps

- No persisted snapshot store (value object until BP-006+)
- Tax / discount masters still in-memory where upstream IPs supply configurations
- **IP-07+ commercial IPs not started** (Expected Commercial Amount, Governance, Validation, packaging)
- **Tax compliance / remittance / evidence is IP-11** (spec drafted; not implemented) — IP-06 freezes commercial tax components only; it does **not** manage statutory obligations, filing calendars, or KRA/eTIMS lifecycle. See `IP-11 Tax Compliance, Remittance & Evidence Management.md`.

### Confirmation

**IP-07, IP-08, IP-09, IP-10, IP-11 and other Build Packs were not started.** Stop condition for IP-06 is met.

---

## Implementation Prompt (archived)

The full IP-06 implementation prompt from the user session is archived below without shortening or paraphrasing.

---

Cursor Implementation Prompt — BP-005 IP-06
Role

You are implementing BP-005 – Pricing, Tax & Commercial Rules, IP-06 – Commercial Resolution Snapshot & Transaction Contract.

You are working in the existing InverBrass Platform repository.

Act as a senior implementation engineer working within the existing architecture.

Implement IP-06 only.

Do not implement IP-07, IP-08, IP-09, IP-10, IP-11, payments, orders, inventory, or other Build Packs.

1. Objective

Implement the authoritative commercial resolution result and snapshot contract that downstream transactional modules can consume.

The purpose of IP-06 is to take the commercial resolution produced by the preceding BP-005 IPs and create a stable, auditable commercial result that downstream transactions can rely on.

The resulting contract must answer:

For this business, customer/party, offering, quantity, channel, currency and effective date, what commercial terms were resolved, how were they determined, what components make up the amount, and what exact values must downstream transactions use?

IP-06 is the boundary between:

Commercial rules/resolution

and

future transactional execution.

2. Mandatory Architecture

The flow must be:

BP-003 Pricing Master
        ↓
IP-01 Base Price Resolution
        ↓
IP-05 Eligibility / Precedence / Conflict
        ↓
IP-02 Commercial Composition
        ↓
IP-03 Tax Resolution
        ↓
IP-04 Discount / Commission components
        ↓
IP-06 Commercial Resolution Snapshot
        ↓
Downstream transaction consumers

Do not bypass the commercial resolution pipeline.

A downstream consumer must never independently query:

pricing_item
tax rules
discount rules
commission rules

to reconstruct the commercial result.

3. Core Principle
Resolve once, consume consistently.

Once IP-06 produces a commercial resolution snapshot:

downstream consumers use the snapshot;
later changes to pricing configuration must not silently change the historical transaction;
the snapshot retains the provenance of how the result was derived;
the original resolved components remain identifiable;
all monetary values remain internally consistent.
4. Scope
Included

IP-06 must provide:

Commercial resolution result contract.
Snapshot structure.
Immutable resolved monetary values.
Component breakdown.
Base-price provenance.
Tax provenance.
Discount provenance.
Commission provenance.
Pricing/commercial rule version references where available.
Resolution request context.
Effective date/time.
Currency.
Quantity.
Party/customer context.
Channel/context.
Business isolation.
Deterministic payable calculation.
Snapshot validation.
Snapshot serialization/consumption contract.
Audit/provenance metadata.
Downstream adapter/consumer contract.
Regression protection for IP-01 through IP-05.
5. Explicitly Out of Scope

Do not implement:

Product/offering master.
Pricing master.
Pricing CRUD.
New pricing UI.
Tax-rate master.
Tax-rule authoring UI.
Payment execution.
Payment split.
Payment reconciliation.
Sales order creation.
Checkout.
Receipting.
Inventory.
Accounting ledger posting.
Tax remittance/payment.
Tax filing.
Tax compliance evidence management.
Revenue assurance.
KRA/eTIMS integration.
Customer CRM functionality.

IP-11 will own tax compliance/remittance/evidence.

BP-006/BP-007 will own future transactional/payment concerns.

6. Commercial Resolution Contract

Create a clear authoritative contract, for example:

CommercialResolution

The exact naming should follow existing repository conventions.

It should contain, at minimum:

Context
businessId
partyId/customerId (when supplied)
offeringId
productId (when available)
channel
catalogueId
currency
quantity
effectiveAt
resolvedAt
Base price
basePrice
basePriceItemId
basePriceCatalogueId
pricingMethod
Components

Represent resolved components generically rather than hard-coding the model around only today's components.

Example conceptual structure:

components[]:
    componentType
    componentCode
    description
    amount
    currency
    rate
    calculationBasis
    source
    provenance

Possible component types include:

PRINCIPAL
DISCOUNT
COMMISSION
TAX
FEE
SURCHARGE
OTHER

Do not assume all future components must be implemented now.

7. Monetary Integrity

Use the existing commercial-money approach.

Do not use floating-point arithmetic for authoritative monetary calculations.

Maintain:

principal
+ fees/charges
+ tax
- discounts
= payable

subject to the composition rules already established by IP-02 through IP-05.

The result must reconcile exactly.

Reject inconsistent composition rather than silently correcting it.

8. Snapshot Semantics

The snapshot must preserve the exact commercial result used by a downstream transaction.

For example:

BP-003 current price:
KES 1,000

IP-03 tax:
KES 160

IP-04 commission:
KES 50

IP-02 composition:
Principal  = 1,000
Commission = 50
Tax        = 160
Payable    = 1,210

If BP-003 subsequently changes the price to KES 1,200, an existing snapshot must remain:

Principal = 1,000
Commission = 50
Tax = 160
Payable = 1,210

unless an explicit new commercial resolution is requested.

9. Provenance

Preserve provenance from upstream resolution.

At minimum the snapshot should be able to identify:

BP-003 pricing item
pricing catalogue
pricing method
IP-05 precedence decision
tax rule/configuration used
discount source where applicable
commission source where applicable
resolution timestamp
effective date

Do not invent provenance for information that upstream services do not provide.

Where upstream configuration is currently in-memory, retain the available rule/configuration identity rather than pretending it is persisted.

10. Resolution Request

Create a canonical request contract.

It should support, where available:

businessId
offeringId
partyId
customer context
channel
catalogue
currency
quantity
effectiveAt

The implementation must remain extensible.

Do not create unnecessary fields merely to anticipate every future industry.

11. Snapshot vs Re-resolution

Implement explicit distinction between:

Resolve

Determine what commercial terms apply now for the supplied context.

Snapshot

Freeze the resolved commercial result for downstream use.

Re-resolve

Explicitly request a new commercial result.

Never silently re-resolve a historical snapshot because:

price changed;
tax configuration changed;
discount changed;
commission changed;
catalogue changed.
12. Idempotency / Duplicate Protection

Where IP-06 creates persisted snapshots, define deterministic duplicate/idempotency behaviour.

Do not create multiple logically identical snapshots accidentally because the same request was submitted twice.

If the architecture does not yet require persistence, implement the contract/service boundary cleanly and document persistence as the appropriate downstream transaction boundary.

Do not introduce persistence simply because the requirement says snapshot.

First inspect the existing architecture and determine whether IP-06's snapshot is:

an immutable application-level resolution object, or
a persisted commercial snapshot.

Choose the option consistent with existing architecture.

Document the decision.

13. Persistence Decision

Before adding migrations or tables:

Inspect:

src/db/schema/
drizzle/
existing commercial modules
existing transaction models
existing quotation models

Determine whether an IP-06 persistence table already exists or whether the snapshot should remain a value object until BP-006 owns the transactional record.

Do not create a second transactional master.

If persistence is necessary, design it as a snapshot, not another pricing/tax master.

If no persistence is necessary at this stage:

explicitly document why IP-06 produces an immutable resolution contract consumed by the downstream transaction owner.

14. Downstream Contract

Provide a clean consumer-facing contract.

Conceptually:

CommercialResolutionService.resolve(...)
        ↓
CommercialResolution
        ↓
CommercialSnapshot
        ↓
Downstream transaction

The consumer should not need to know:

how pricing was selected;
which candidates lost;
how tax rules were evaluated;
how precedence was calculated.

Those remain inside commercial resolution/provenance.

The consumer needs the authoritative result.

15. CRM Regression

The existing CRM quotation path must continue to use:

QuotationService
    ↓
PricingResolutionAdapter
    ↓
BasePriceResolutionService
    ↓
IP-05

Enhance it only where necessary so that the resulting commercial resolution can be consumed through the new IP-06 contract.

Do not reintroduce local pricing logic into CRM.

CRM must not become a second commercial-resolution engine.

16. Existing BP-005 UX

If IP-06 exposes or modifies the existing:

/commercial/resolve

workspace, maintain the established UX standards.

The workspace already follows:

Base Price → Components → Tax → Review

IP-06 should own the Review / Final Resolution stage.

The UI must provide:

clear step progression;
Previous/Next navigation;
loading/progress feedback;
errors beside the affected step/field;
no generic error dump at the top;
clear success state;
clear resolved amount;
component breakdown;
provenance summary where useful;
next action;
ability to return to previous steps;
search/empty states where applicable.

Do not expose unnecessary internal implementation details.

17. Review Screen

The final commercial review should make it easy to understand:

Product / Offering
Customer
Quantity
Currency
Channel

Base price
+ Commission
+ Tax
- Discount
----------------
Payable

Resolution status
Effective date

Where applicable:

Pricing source
Tax source
Commercial rules

should be available as supporting detail.

The user must be able to clearly distinguish:

Resolved commercial amount

from

Actual payment collected

because payment does not belong to IP-06.

18. Error Handling

Use explicit errors for:

NO_COMMERCIAL_RESOLUTION
BASE_PRICE_UNAVAILABLE
BASE_PRICE_CONFLICT
INVALID_COMMERCIAL_COMPONENT
COMMERCIAL_COMPOSITION_CONFLICT
COMMERCIAL_AMOUNT_MISMATCH
INVALID_CURRENCY
INVALID_CONTEXT
SNAPSHOT_INVALID
SNAPSHOT_NOT_FOUND

Follow existing error conventions.

Errors must provide useful next actions.

Example:

Commercial resolution cannot be completed.
No applicable base price was found for this offering and channel.
Next action: Configure an active price in Product → Pricing.

Do not silently default to zero.

19. Business Rules

Implement at minimum:

BRU-001

Every commercial resolution must be scoped by businessId.

BRU-002

The final payable must reconcile exactly with its components.

BRU-003

A commercial snapshot must preserve the resolved monetary values.

BRU-004

A snapshot must not change merely because upstream configuration changes.

BRU-005

A new resolution must be explicitly requested to obtain changed commercial terms.

BRU-006

Downstream consumers must consume the authoritative IP-06 result.

BRU-007

Downstream modules must not independently calculate commercial amounts.

BRU-008

A failed upstream resolution must fail the commercial resolution; no invented fallback price.

BRU-009

Conflicting base-price candidates must remain unresolved unless IP-05 produces a valid winner.

BRU-010

Historical commercial results must retain available provenance.

BRU-011

Tax compliance/remittance does not form part of the commercial snapshot execution responsibility; IP-11 owns that lifecycle.

BRU-012

Payment execution and actual collection must remain separate from resolved payable.

20. Acceptance Criteria

Implement smoke tests covering at least:

TC-01 — Full commercial resolution

Given:

Business
Offering
Customer
Channel
Currency
Quantity

and valid BP-003 pricing,

then IP-06 produces a complete commercial resolution.

TC-02 — Component integrity

Given:

Principal
Tax
Commission
Discount

the final payable reconciles exactly.

TC-03 — Provenance

The resolution retains upstream pricing and commercial provenance.

TC-04 — Snapshot stability

Resolve and snapshot a commercial amount.

Change upstream pricing.

Verify the snapshot remains unchanged.

TC-05 — Re-resolution

After changing upstream configuration, explicitly re-resolve.

Verify the new resolution reflects the new configuration while the previous snapshot remains unchanged.

TC-06 — Conflict

Create a BP-005 IP-05 pricing conflict.

Verify IP-06 does not produce a payable result.

TC-07 — Missing price

No eligible price.

Verify explicit failure with actionable error.

TC-08 — Tenant isolation

Business A cannot resolve or consume commercial data belonging to Business B.

TC-09 — CRM regression

Verify CRM quotation pricing still flows through:

PricingResolutionAdapter
→ IP-01
→ IP-05
→ IP-06

without local pricing calculation.

TC-10 — BP-003 regression

Existing BP-003 pricing smoke must continue to pass.

TC-11 — IP-01 regression

Existing IP-01 smoke must pass.

TC-12 — IP-02 regression

Existing IP-02 smoke must pass.

TC-13 — IP-03 regression

Existing IP-03 smoke must pass.

TC-14 — IP-05 regression

Existing IP-05 smoke must pass.

TC-15 — Money precision

Use fractional/decimal monetary values and verify exact reconciliation without floating-point drift.

TC-16 — UX

If IP-06 modifies the workspace:

Verify:

loading state;
step progression;
contextual errors;
Previous/Next;
successful review;
actionable failure;
no top-level generic error dump.
21. Quality Gates

Before handover:

npm run typecheck
npm run lint

Run:

BP-003 IP-011 smoke
BP-005 IP-01 smoke
BP-005 IP-02 smoke
BP-005 IP-03 smoke
BP-005 IP-05 smoke
BP-005 IP-06 smoke

If applicable:

npm run db:migrate

Only if migrations were actually introduced.

Do not modify shared migration/schema/seed files unnecessarily.

22. Shared-file discipline

Do not modify:

drizzle/meta/_journal.json
src/db/schema/index.ts
src/db/seed.ts

unless the implementation genuinely requires a migration/schema/reference-data change.

If any shared file must change:

explain why;
make the minimum change;
report it explicitly in the handover.

Do not create migrations for purely in-memory/value-object contracts.

23. Documentation

Update:

BP-005 IP-06 Commercial Resolution Snapshot & Transaction Contract.md

with:

implementation status;
architecture implemented;
files created;
files modified;
tests;
quality gates;
intentional gaps;
persistence decision;
downstream contract;
UX implementation, if applicable;
migration/schema changes, if any.

At the bottom of the document, preserve this complete implementation prompt verbatim as the archived implementation instruction.

24. Stop Condition

When IP-06 is complete:

STOP.

Do not implement:

IP-07+
IP-11
Payments
Sales Orders
Checkout
Inventory
Revenue Assurance
Tax Compliance UI
KRA/eTIMS integration

Report the implementation and validation results.

Final architectural target

The completed BP-005 commercial pipeline should be:

BP-003
Pricing Master
    ↓
IP-01
Base Price Resolution
    ↓
IP-05
Precedence / Conflict
    ↓
IP-02
Commercial Composition
    ↓
IP-03
Tax Calculation
    ↓
IP-04
Discount / Commission
    ↓
IP-06
Commercial Resolution Snapshot
    ↓
--------------------------------
Authoritative Commercial Contract
--------------------------------
    ↓
Future BP-006 Sales
Future BP-007 Payments
Future BP-008 Inventory

Do not implement beyond IP-06.
