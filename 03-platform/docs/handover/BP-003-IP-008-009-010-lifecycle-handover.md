# BP-003 Lifecycle Agent — Implementation Handover

**Branch:** `feature/bp003-lifecycle`  
**Agent:** BP-003 Lifecycle Agent  
**Date:** 2026-08-01  
**IPs Delivered:** IP-008, IP-009, IP-010

---

## Summary

Implemented the complete operational lifecycle stack for offerings:

| IP | Capability | Status |
|----|------------|--------|
| IP-008 | Product Lifecycle Management | Delivered |
| IP-009 | Offering Documents & Compliance | Delivered |
| IP-010 | Offering Relationships | Delivered |

---

## Database Migrations

| Migration | IP | Tables |
|-----------|-----|--------|
| `0033_bp003_ip008_product_lifecycle.sql` | IP-008 | `product_lifecycle`, `product_lifecycle_event` |
| `0034_bp003_ip009_offering_documents.sql` | IP-009 | `offering_document`, `offering_document_link` |
| `0035_bp003_ip010_offering_relationships.sql` | IP-010 | `offering_relationship_type`, `offering_relationship` |

### Integration Required (restricted files — not modified per agent rules)

The following files must be updated to register new schema and seeds:

**`src/db/schema/index.ts`** — add exports:
```typescript
export { productLifecycle } from "./product-lifecycle";
export { productLifecycleEvent } from "./product-lifecycle-event";
export { offeringDocument } from "./offering-document";
export { offeringDocumentLink } from "./offering-document-link";
export { offeringRelationshipType } from "./offering-relationship-type";
export { offeringRelationship } from "./offering-relationship";
```

**`drizzle/meta/_journal.json`** — register migrations 0033, 0034, 0035.

**`src/db/seed.ts`** — wire `offering-relationship-types.ts` seed for business-scoped relationship type catalogue (mirror `relationship-types-seed.ts` pattern).

Run migrations after registration:
```bash
npm run db:migrate
```

---

## Architecture

```
Product Workspace UI
  → Server Actions (AuthActionResult / PlatformActionResult)
    → Service Layer (orchestration, business rules, timeline, audit)
      → Repository Layer (Drizzle)
        → PostgreSQL
```

### Engine Integration

| Engine | Usage |
|--------|-------|
| ENG-005 Workflow | Integration stubs — publish events only; no workflow logic built |
| ENG-009 Notifications | Integration stubs — publish events only |
| ENG-013 Audit | `recordProductEntityAudit` on all state changes |
| ENG-015 Document | `offering_document` storage via Supabase abstraction |
| ENG-015a Compliance | `buildComplianceSummary`, `buildRequirementRows` via evidence adapter |
| ENG-003b Regulatory | Document requirements via `RegulatoryDocumentRequirementsService` |
| ENG-003a Configuration | `DEFAULT_PRODUCT_LIFECYCLE_POLICIES` — configurable lifecycle policies |
| Product Timeline | Lifecycle, document, and relationship events |

---

## IP-008 — Product Lifecycle Management

### Files Created
- Schema: `product-lifecycle.ts`, `product-lifecycle-event.ts`
- Migration: `0033_bp003_ip008_product_lifecycle.sql`
- Repositories: `product-lifecycle-repository.ts`, `product-lifecycle-event-repository.ts`
- Service: `product-lifecycle-rules.ts`, `product-lifecycle-service.ts`
- Validators: `product-lifecycle-validators.ts`
- Actions: `product-lifecycle-actions.ts`
- UI: `product-lifecycle-panel.tsx`, `product-lifecycle-dashboard.tsx`
- Route: `/products/lifecycle`
- Smoke: `bp003-ip008-product-lifecycle-smoke-validation.ts`

### Business Rules
- 8 lifecycle states: DRAFT → PENDING_APPROVAL → APPROVED → ACTIVE → SUSPENDED → DEPRECATED → DISCONTINUED → ARCHIVED
- Explicit governed actions (no free status dropdown)
- Configuration-driven policies via `DEFAULT_PRODUCT_LIFECYCLE_POLICIES`
- Only one ACTIVE version (configurable `maximumActiveVersions`)
- Replacement product validation (no self-reference)
- Scheduled activation/suspension/archive (stored only — no background jobs)
- Version increment (major/minor)

---

## IP-009 — Offering Documents & Compliance

### Files Created
- Schema: `offering-document.ts`, `offering-document-link.ts`
- Migration: `0034_bp003_ip009_offering_documents.sql`
- Repositories, adapter, rules, service, validators, actions
- UI: `offering-documents-panel.tsx`, `offering-compliance-panel.tsx`
- Smoke: `bp003-ip009-offering-documents-smoke-validation.ts`

### Business Rules
- Consumes ENG-015/015a — no duplicate compliance calculation
- Document matrix checklist in Compliance tab
- `PlatformDocumentPreview` for in-app preview
- Unlimited documents/versions; latest version active
- Archived offerings read-only

---

## IP-010 — Offering Relationships

### Files Created
- Schema: `offering-relationship-type.ts`, `offering-relationship.ts`
- Migration: `0035_bp003_ip010_offering_relationships.sql`
- Seed: `offering-relationship-types.ts` (15 configurable types)
- Repositories, rules, service, validators, actions
- UI: `offering-relationships-panel.tsx`
- Smoke: `bp003-ip010-offering-relationships-smoke-validation.ts`

### Business Rules
- Configurable relationship types (not hardcoded)
- Duplicate prevention via unique index
- Circular DEPENDS_ON detection via graph traversal
- Sections: Required, Optional, Cross Sell, Upgrade Path, Alternatives, Compatibility, Dependencies

---

## Workspace Tabs Enabled

| Tab | IP |
|-----|-----|
| Lifecycle | IP-008 |
| Documents | IP-009 |
| Compliance | IP-009 |
| Relationships | IP-010 |

---

## Quality Gates

| Gate | Result |
|------|--------|
| ESLint | Pass (0 errors; pre-existing warnings in IP-002 only) |
| TypeScript / Production Build | Pass |
| Smoke IP-008 | Pass |
| Smoke IP-009 | Pass |
| Smoke IP-010 | Pass |

---

## Manual Verification Checklist

1. Apply migrations 0033–0035 after schema index registration
2. Seed offering relationship types per business
3. Open Product Workspace → Lifecycle tab → submit for approval → approve → activate
4. Upload document on Documents tab → verify preview works
5. Check Compliance tab document matrix
6. Add relationship on Relationships tab
7. Visit `/products/lifecycle` dashboard

---

## Future Enhancements

- Wire ENG-005 workflow instances for approval and document verification
- Wire ENG-009 notification delivery for lifecycle and document events
- Background scheduler for `scheduled_action` / `scheduled_at` fields
- Consolidate `offering_document` into generic ENG-015 platform document table (AV-2.0)
- Generic `offering_type` + `offering_id` for non-product offerings (variants, bundles)
- ENG-003a business configuration UI for lifecycle policies

---

**Stop — awaiting next assignment.**
