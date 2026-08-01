# BP-003 — FINAL Implementation Handover

**Branch:** `feature/bp003-lifecycle`  
**Build Pack:** BP-003 – Product & Service (Offering) Management  
**Architecture Version:** AV-1.5 (Engine Catalog Lock)  
**Date:** 2026-08-01  
**Agent:** BP-003 Lifecycle Agent (IP-008 / IP-009 / IP-010)  
**Scope note:** This handover covers all IPs delivered on the branch. IP-004–IP-007 remain specification-only (owned by other agents).

---

## 1. Summary of Completed IPs

| IP | Name | Status | Migration |
|----|------|--------|-----------|
| **IP-001** | Product & Service Foundation | **Complete** (committed) | `0028_bp003_ip001_product_foundation.sql` |
| **IP-002** | Product Classification & Categorization | **Complete** (committed) | `0029`, `0030` |
| **IP-003** | Units of Measure Engine | **Complete** (committed) | `0031_bp003_ip003_unit_engine.sql` |
| IP-004 | Product Attributes Engine | Not implemented | — |
| IP-005 | Product Variant Engine | Not implemented | — |
| IP-006 | Bundles & Packages | Not implemented | — |
| IP-007 | Digital Catalogue | Not implemented | — |
| **IP-008** | Product Lifecycle Management | **Complete** | `0033_bp003_ip008_product_lifecycle.sql` |
| **IP-009** | Offering Documents & Compliance | **Complete** | `0034_bp003_ip009_offering_documents.sql` |
| **IP-010** | Offering Relationships | **Complete** | `0035_bp003_ip010_offering_relationships.sql` |
| IP-011+ | Pricing, Analytics, Governance, Roadmap | Not in scope | — |

### Lifecycle Agent Ownership (IP-008 / IP-009 / IP-010)

Delivered the operational lifecycle of an offering from governed activation through document compliance to inter-offering relationships:

- **IP-008** — Governed lifecycle states, approval path, versioning, replacement, scheduling, lifecycle dashboard
- **IP-009** — ENG-015/015a document consumer, compliance matrix, Documents + Compliance workspace tabs
- **IP-010** — Configurable offering relationships, circular dependency prevention, Relationships workspace tab

---

## 2. Files Created

### IP-008 — Product Lifecycle Management (14 files)

| Layer | Path |
|-------|------|
| Migration | `drizzle/0033_bp003_ip008_product_lifecycle.sql` |
| Schema | `src/db/schema/product-lifecycle.ts` |
| Schema | `src/db/schema/product-lifecycle-event.ts` |
| Repository | `src/modules/product/repositories/product-lifecycle-repository.ts` |
| Repository | `src/modules/product/repositories/product-lifecycle-event-repository.ts` |
| Rules | `src/modules/product/services/product-lifecycle-rules.ts` |
| Service | `src/modules/product/services/product-lifecycle-service.ts` |
| Validators | `src/modules/product/validators/product-lifecycle-validators.ts` |
| Actions | `src/modules/product/actions/product-lifecycle-actions.ts` |
| UI | `src/modules/product/components/product-lifecycle-panel.tsx` |
| UI | `src/modules/product/components/product-lifecycle-dashboard.tsx` |
| Route | `src/app/(authenticated)/(app)/products/lifecycle/page.tsx` |
| Smoke | `scripts/bp003-ip008-product-lifecycle-smoke-validation.ts` |

### IP-009 — Offering Documents & Compliance (13 files)

| Layer | Path |
|-------|------|
| Migration | `drizzle/0034_bp003_ip009_offering_documents.sql` |
| Schema | `src/db/schema/offering-document.ts` |
| Schema | `src/db/schema/offering-document-link.ts` |
| Repository | `src/modules/product/repositories/offering-document-repository.ts` |
| Repository | `src/modules/product/repositories/offering-document-link-repository.ts` |
| Adapter | `src/modules/product/adapters/offering-document-evidence-adapter.ts` |
| Rules | `src/modules/product/services/offering-document-rules.ts` |
| Service | `src/modules/product/services/offering-document-service.ts` |
| Validators | `src/modules/product/validators/offering-document-validators.ts` |
| Actions | `src/modules/product/actions/offering-document-actions.ts` |
| UI | `src/modules/product/components/offering-documents-panel.tsx` |
| UI | `src/modules/product/components/offering-compliance-panel.tsx` |
| Smoke | `scripts/bp003-ip009-offering-documents-smoke-validation.ts` |

### IP-010 — Offering Relationships (12 files)

| Layer | Path |
|-------|------|
| Migration | `drizzle/0035_bp003_ip010_offering_relationships.sql` |
| Schema | `src/db/schema/offering-relationship-type.ts` |
| Schema | `src/db/schema/offering-relationship.ts` |
| Seed | `src/db/seeds/offering-relationship-types.ts` |
| Repository | `src/modules/product/repositories/offering-relationship-type-repository.ts` |
| Repository | `src/modules/product/repositories/offering-relationship-repository.ts` |
| Rules | `src/modules/product/services/offering-relationship-rules.ts` |
| Service | `src/modules/product/services/offering-relationship-service.ts` |
| Validators | `src/modules/product/validators/offering-relationship-validators.ts` |
| Actions | `src/modules/product/actions/offering-relationship-actions.ts` |
| UI | `src/modules/product/components/offering-relationships-panel.tsx` |
| Smoke | `scripts/bp003-ip010-offering-relationships-smoke-validation.ts` |

### Prior Branch Delivery (IP-001 / IP-002 / IP-003 — committed)

Key artifacts already on branch (see git history `ae182b7` → `343787a`):

- Migrations `0028`–`0031`
- Product module: repositories, services, validators, actions, workspace UI
- Classification tree, unit engine, dashboards
- Smoke scripts: `bp003-ip001`, `bp003-ip002`, `bp003-ip003`

---

## 3. Files Modified

### IP-008 / IP-009 / IP-010 integration touchpoints

| File | Change |
|------|--------|
| `src/modules/product/constants.ts` | Lifecycle states, document/relationship constants; enabled Lifecycle, Documents, Compliance, Relationships tabs |
| `src/modules/product/types.ts` | Lifecycle, document, relationship view/payload types |
| `src/modules/product/errors.ts` | Lifecycle, document, relationship error codes |
| `src/modules/product/components/product-workspace.tsx` | Wired Lifecycle, Documents, Compliance, Relationships tabs |
| `src/app/(authenticated)/(app)/products/[productId]/page.tsx` | Parallel data fetch for lifecycle, documents, relationships panels |
| `src/core/product-timeline/constants.ts` | DOCUMENTS / RELATIONSHIPS categories; 8 new event types |
| `src/core/audit/constants.ts` | `product_lifecycle`, `offering_document`, `offering_relationship` entity + source modules |

---

## 4. Database Migrations

| # | File | IP | Tables Created |
|---|------|-----|----------------|
| 0028 | `0028_bp003_ip001_product_foundation.sql` | IP-001 | `product`, `product_type`, `product_status`, `product_timeline` |
| 0029 | `0029_bp003_ip002_product_classification.sql` | IP-002 | `product_classification*`, `product_classification_type` |
| 0030 | `0030_bp003_ip002_classification_enhancements.sql` | IP-002 | Classification enhancements |
| 0031 | `0031_bp003_ip003_unit_engine.sql` | IP-003 | `unit_category`, `unit_of_measure`, `unit_timeline` |
| **0033** | **`0033_bp003_ip008_product_lifecycle.sql`** | **IP-008** | **`product_lifecycle`, `product_lifecycle_event`** |
| **0034** | **`0034_bp003_ip009_offering_documents.sql`** | **IP-009** | **`offering_document`, `offering_document_link`** |
| **0035** | **`0035_bp003_ip010_offering_relationships.sql`** | **IP-010** | **`offering_relationship_type`, `offering_relationship`** |

**Journal status:** Migrations `0028`–`0031` registered in `drizzle/meta/_journal.json`. Migrations **`0033`–`0035` are NOT yet registered** (intentionally deferred — see Integration Checklist).

---

## 5. Schema Changes

### New Drizzle schema files (not yet exported from `index.ts`)

```
src/db/schema/product-lifecycle.ts          → product_lifecycle
src/db/schema/product-lifecycle-event.ts    → product_lifecycle_event
src/db/schema/offering-document.ts          → offering_document
src/db/schema/offering-document-link.ts     → offering_document_link
src/db/schema/offering-relationship-type.ts → offering_relationship_type
src/db/schema/offering-relationship.ts      → offering_relationship
```

Repositories import these directly via `@/db/schema/<file>` — no `index.ts` export required for runtime, but registration is recommended for Drizzle kit consistency.

### Key columns (IP-008 lifecycle)

- `product_lifecycle`: `current_state`, `previous_state`, `effective_from/to`, `approval_required`, `approval_status`, `retirement_reason`, `replacement_product_id`, `version_number`, `major_version`, `minor_version`, `scheduled_action`, `scheduled_at`
- `product_lifecycle_event`: append-only event log with `event_type`, `old_state`, `new_state`, `reason`, `performed_by`

### Key columns (IP-009 documents)

- `offering_document`: mirrors ENG-015 party document pattern (`product_id`, storage refs, verification, supersedes chain)
- `offering_document_link`: `offering_id`, `offering_type`, `document_id`, `is_primary`, effective dates

### Key columns (IP-010 relationships)

- `offering_relationship_type`: business-scoped configurable catalogue (`code`, `name`, `is_bidirectional`)
- `offering_relationship`: `source_offering_id`, `target_offering_id`, `relationship_type_id`, effective dates, `status`

---

## 6. New Routes

| Route | IP | Purpose |
|-------|-----|---------|
| `/products` | IP-001 | Product catalogue dashboard |
| `/products/new` | IP-001 | Product registration |
| `/products/[productId]` | IP-001+ | Product workspace (all tabs) |
| `/products/classifications` | IP-002 | Classification dashboard |
| `/products/classifications/[classificationId]` | IP-002 | Classification workspace |
| `/products/units` | IP-003 | Units dashboard |
| `/products/units/new` | IP-003 | Unit registration |
| `/products/units/[unitId]` | IP-003 | Unit workspace |
| **`/products/lifecycle`** | **IP-008** | **Lifecycle KPI dashboard** |

### Product Workspace tabs enabled

| Tab | IP | Available |
|-----|-----|-----------|
| Overview | IP-001 | Yes |
| Catalogue Structure | IP-002 | Yes |
| Units | IP-003 | Yes |
| **Lifecycle** | **IP-008** | **Yes** |
| **Documents** | **IP-009** | **Yes** |
| **Compliance** | **IP-009** | **Yes** |
| **Relationships** | **IP-010** | **Yes** |
| Timeline | IP-001 | Yes |
| Audit History | IP-001 | Yes |
| Attributes | IP-004 | Placeholder |
| Variants | IP-005 | Placeholder |
| Bundles | IP-006 | Placeholder |
| Pricing | IP-011 | Placeholder |
| Analytics | IP-012 | Placeholder |

---

## 7. Business Rules Implemented

### IP-008 — Lifecycle

| Rule | Implementation |
|------|----------------|
| 8 governed states | `PRODUCT_LIFECYCLE_STATE_CODES` in `product-lifecycle-rules.ts` |
| Explicit transitions only | `canTransitionLifecycleState()` — no free dropdown |
| Configuration-driven policies | `DEFAULT_PRODUCT_LIFECYCLE_POLICIES` (ENG-003a target) |
| One active version | `maximumActiveVersions: 1` enforced in service |
| Approval before activation | `canSubmitForApproval`, `canApprove`, `canActivate` |
| No self-replacement | `isSelfReplacement()` |
| Effective date validation | `hasValidEffectiveDates()` |
| Version increment | `incrementVersion()` major/minor |
| Scheduled actions | Stored in `scheduled_action` / `scheduled_at` — no scheduler |
| Sync to IP-001 status | `mapLifecycleStateToProductStatus()` updates `product.status_code` |

### IP-009 — Documents & Compliance

| Rule | Implementation |
|------|----------------|
| Unlimited documents per offering | No count limits in service |
| Version chain via supersedes | `supersedesDocumentId` on `offering_document` |
| ENG-015a compliance only | `buildComplianceSummary` / `buildRequirementRows` — no local scoring |
| Mandatory docs from ENG-003b | `RegulatoryDocumentRequirementsService` |
| Document matrix | Compliance tab checklist (required vs uploaded vs verified) |
| In-app preview | `PlatformDocumentPreview` — no `window.open()` |
| MIME/size validation | `offering-document-rules.ts` |
| Archived read-only | Enforced at service layer |

### IP-010 — Relationships

| Rule | Implementation |
|------|----------------|
| Configurable types from DB | `offering_relationship_type` — 15 seed types |
| No duplicate active relationships | Unique index on source+target+type |
| No self-relationships | `isSelfRelationship()` |
| Circular DEPENDS_ON prevention | `wouldCreateCircularDependency()` graph traversal |
| Expired relationships ignored | Date + status filtering in service |
| Section grouping | `groupRelationshipsBySection()` |

---

## 8. Industry Experience Support

| Capability | Engine | Usage |
|------------|--------|-------|
| Industry-native catalogue labels | ENG-003k | `offering-terminology.ts` — nav labels by industry (Loan Products, Medical Services, Courses, etc.) |
| Product type filtering | ENG-003k | `IndustryExperienceService.filterProductTypesForBusiness()` in product registration |
| Offering terminology | ENG-003f/003k | Internal "Offering" / UI "Product" separation; frozen `product_*` schema |
| Regulatory document requirements | ENG-003b | IP-009 compliance resolution by country/industry/classification |
| Relationship types | ENG-003b target | Currently business-scoped seed catalogue; configurable per business |
| Lifecycle policies | ENG-003a target | `DEFAULT_PRODUCT_LIFECYCLE_POLICIES` — static defaults; UI configuration pending |

Lifecycle, document, and relationship UI uses standard platform labels. Industry-specific relationship examples (Banking, Healthcare, Education) are supported via configurable `offering_relationship_type` seeds, not hardcoded logic.

---

## 9. Smoke Validation Results

Run from `03-platform/`:

```bash
npx tsx scripts/bp003-ip008-product-lifecycle-smoke-validation.ts
npx tsx scripts/bp003-ip009-offering-documents-smoke-validation.ts
npx tsx scripts/bp003-ip010-offering-relationships-smoke-validation.ts
```

| Script | IP | Result |
|--------|-----|--------|
| `bp003-ip001-product-foundation-smoke-validation.ts` | IP-001 | On branch (prior delivery) |
| `bp003-ip002-product-classification-smoke-validation.ts` | IP-002 | On branch (prior delivery) |
| `bp003-ip003-unit-engine-smoke-validation.ts` | IP-003 | On branch (prior delivery) |
| **`bp003-ip008-product-lifecycle-smoke-validation.ts`** | **IP-008** | **22/22 PASS** |
| **`bp003-ip009-offering-documents-smoke-validation.ts`** | **IP-009** | **19/19 PASS** |
| **`bp003-ip010-offering-relationships-smoke-validation.ts`** | **IP-010** | **17/17 PASS** |

Smoke scripts are read-only: file inventory, rule unit tests, service instantiation — no DB mutation.

---

## 10. Quality Gates

| Gate | Command | Result |
|------|---------|--------|
| ESLint | `npm run lint` | **Pass** — 0 errors (9 pre-existing warnings in IP-002, unrelated) |
| TypeScript | `npm run build` | **Pass** — Next.js 16.2.10 production build successful |
| Smoke IP-008 | see above | **Pass** (22/22) |
| Smoke IP-009 | see above | **Pass** (19/19) |
| Smoke IP-010 | see above | **Pass** (17/17) |

---

## 11. Known Limitations

| Limitation | IP | Notes |
|------------|-----|-------|
| Migrations 0033–0035 not in journal | All lifecycle | Must register before `db:migrate` |
| Schema exports not in `index.ts` | All lifecycle | Repositories use direct imports; kit registration pending |
| Relationship type seed not wired | IP-010 | `offering-relationship-types.ts` exists; `seed.ts` not updated |
| No ENG-005 workflow instances | IP-008, IP-009 | Approval/verification publish events only |
| No ENG-009 notification delivery | IP-008, IP-009 | Event stubs only |
| No background scheduler | IP-008 | `scheduled_action` stored; future scheduler consumes |
| IP-001 header lifecycle buttons coexist | IP-008 | Overview tab still has Activate/Suspend/Archive from IP-001; Lifecycle tab is canonical governed path |
| `offering_document` vs generic ENG-015 | IP-009 | Offering-specific storage table; AV-2.0 may consolidate to platform document |
| Product-only offering IDs | IP-010 | Schema uses `product.id`; `offering_type` on link table prepared for future |
| IP-004–007 not implemented | — | Attributes, Variants, Bundles, Catalogue tabs remain placeholders |
| Document compliance requires ENG-003b rule sets | IP-009 | Empty compliance matrix if no regulatory rule set configured for business |
| DATABASE_URL required for runtime | All | Build succeeds; live features need PostgreSQL + storage |

---

## 12. Integration Checklist

### New migration files (add to journal)

```
drizzle/0033_bp003_ip008_product_lifecycle.sql
drizzle/0034_bp003_ip009_offering_documents.sql
drizzle/0035_bp003_ip010_offering_relationships.sql
```

Add entries to `drizzle/meta/_journal.json` after `0031_bp003_ip003_unit_engine` (idx 31, 32, 33).

### Schema exports required (`src/db/schema/index.ts`)

```typescript
export { productLifecycle } from "./product-lifecycle";
export { productLifecycleEvent } from "./product-lifecycle-event";
export { offeringDocument } from "./offering-document";
export { offeringDocumentLink } from "./offering-document-link";
export { offeringRelationshipType } from "./offering-relationship-type";
export { offeringRelationship } from "./offering-relationship";
```

### Journal entries required

| idx | tag |
|-----|-----|
| 32 | `0033_bp003_ip008_product_lifecycle` |
| 33 | `0034_bp003_ip009_offering_documents` |
| 34 | `0035_bp003_ip010_offering_relationships` |

### Seed updates required (`src/db/seed.ts`)

1. Create `src/db/seeds/offering-relationship-types-seed.ts` (mirror `relationship-types-seed.ts` pattern)
2. Wire into `seed.ts` to insert 15 `offering_relationship_type` rows per business
3. Optionally extend `product_status` seed if lifecycle states need reference table alignment (currently managed in `product_lifecycle.current_state`)

### Shared files intentionally NOT modified (per agent rules)

| File | Reason |
|------|--------|
| `drizzle/meta/_journal.json` | Agent constraint — integration handover records required entries |
| `src/db/schema/index.ts` | Agent constraint — exports listed above for integrator |
| `src/db/seed.ts` | Agent constraint — seed wiring documented above |

Also **not modified** (out of scope):

- Attributes, Variants, Bundles, Catalogue, Pricing, Analytics, Governance modules
- ENG-001–ENG-019 catalog documentation (preserved per ENG-CAT-001)

### Post-integration steps

```bash
cd 03-platform
npm run db:migrate
npm run db:seed          # after seed.ts updated
npm run lint
npm run build
npx tsx scripts/bp003-ip008-product-lifecycle-smoke-validation.ts
npx tsx scripts/bp003-ip009-offering-documents-smoke-validation.ts
npx tsx scripts/bp003-ip010-offering-relationships-smoke-validation.ts
```

### Manual verification

1. Product Workspace → **Lifecycle** → Submit for Approval → Approve → Activate
2. **Documents** → Upload → Preview (in-app) → Verify
3. **Compliance** → Document matrix shows required vs uploaded
4. **Relationships** → Add DEPENDS_ON / CROSS_SELL → Confirm duplicate/circular blocked
5. **`/products/lifecycle`** → KPI counts reflect state distribution

---

**End of BP-003 FINAL Implementation Handover**
