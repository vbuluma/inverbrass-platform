BP-003 Catalogue — Final Implementation Handover
Branch: feature/bp003-catalogue
Commit: a41055d — BP003 Catalogue: Complete IP-004 to IP-007
Scope: IP-004 through IP-007 only (IP-008+ not started)
Architecture: Next.js App Router · Server Actions · Drizzle ORM · Repository → Service → Actions → UI · ENG-013 Audit · Timeline · Business-scoped · Optimistic locking

1. Summary of Completed IPs
IP	Engine	Status	Primary capability
IP-004
Product Attributes
Complete
Metadata-driven attribute groups, definitions, options, scopes, and per-product value assignment
IP-005
Product Variants
Complete
Variant CRUD, lifecycle, attribute overrides, clone, search; cascade archive on parent product archive
IP-006
Bundles & Packages
Complete
Bundle CRUD, lifecycle, item management, registration wizard, search; pricing/availability placeholders only
IP-007
Digital Catalogue
Complete
Channel publishing, visibility, scheduling, featured/recommended, search; getPublishedProducts() capability for future APIs
Each IP delivers: migration, Drizzle schema, repositories, services, validators, server actions, UI, product workspace tab, dashboard quick action (where applicable), smoke script, build-pack documentation update, and quality gates.

2. Files Created
Migrations (4)
03-platform/drizzle/0032_bp003_ip004_product_attributes.sql
03-platform/drizzle/0033_bp003_ip005_product_variants.sql
03-platform/drizzle/0034_bp003_ip006_product_bundles.sql
03-platform/drizzle/0035_bp003_ip007_digital_catalogue.sql
Smoke scripts (4)
03-platform/scripts/bp003-ip004-product-attributes-smoke-validation.ts
03-platform/scripts/bp003-ip005-product-variants-smoke-validation.ts
03-platform/scripts/bp003-ip006-product-bundles-smoke-validation.ts
03-platform/scripts/bp003-ip007-digital-catalogue-smoke-validation.ts
IP-004 — Product Attributes (~45 files)
Schema: attribute-group.ts, product-attribute-definition.ts, product-attribute-option.ts, product-attribute-definition-scope.ts, product-attribute-assignment.ts, attribute-timeline.ts

Core: src/core/attribute-timeline/ (6 files), src/core/industry-experience/attribute-group-filters.ts

Module: repositories (5), services (5), validators, actions, attribute-ui-labels.ts, components (attribute-dashboard, attribute-definition-workspace, attribute-definition-registration-form, dynamic-attribute-renderer, product-attributes-panel)

Routes: /products/attributes, /products/attributes/groups/new, /products/attributes/groups/[groupId], /products/attributes/definitions/new, /products/attributes/definitions/[definitionId]

IP-005 — Product Variants (~35 files)
Schema: product-variant.ts, product-variant-attribute.ts, variant-timeline.ts

Core: src/core/variant-timeline/ (6 files), src/core/industry-experience/variant-terminology.ts

Module: repositories (2), services (4), validators, actions, variant-ui-labels.ts, components (variant-dashboard, variant-registration-form, variant-workspace, product-variants-panel, variant-timeline-panel, variant-audit-history-panel)

Routes: /products/variants, /products/variants/new, /products/variants/[variantId]

IP-006 — Bundles & Packages (~30 files)
Schema: product-bundle.ts, product-bundle-item.ts, bundle-timeline.ts

Core: src/core/bundle-timeline/ (6 files), src/core/industry-experience/bundle-terminology.ts

Module: repositories (2), services (3), validators, actions, bundle-ui-labels.ts, components (bundle-dashboard, bundle-registration-wizard, bundle-workspace, product-bundles-panel, bundle-timeline-panel, bundle-audit-history-panel)

Routes: /products/bundles, /products/bundles/new, /products/bundles/[bundleId]

IP-007 — Digital Catalogue (~25 files)
Schema: catalogue-channel.ts, product-catalogue-publication.ts

Core: src/core/industry-experience/digital-catalogue-terminology.ts

Module: repositories (2), services (2), validators, actions, catalogue-ui-labels.ts, components (catalogue-dashboard, catalogue-workspace, catalogue-preview-panel, product-catalogue-panel)

Routes: /products/catalogue, /products/catalogue/[productId]

Agent governance
.cursor/agents.md — BP-003 Catalogue Agent scope and rules
3. Files Modified
File	Changes
03-platform/src/modules/product/constants.ts
Workspace tabs enabled (attributes, variants, bundles, catalogue); status/type/visibility codes and labels
03-platform/src/modules/product/errors.ts
Error codes and user messages for all four IPs
03-platform/src/modules/product/types.ts
View/payload types for attributes, variants, bundles, catalogue
03-platform/src/modules/product/services/product-service.ts
Cascade variant archive on product archive (BR-004)
03-platform/src/modules/product/components/product-workspace.tsx
Attributes, Variants, Bundles, Catalogue tabs wired
03-platform/src/modules/product/components/product-dashboard.tsx
Quick actions for Attributes, Variants, Bundles, Digital Catalogue
03-platform/src/app/(authenticated)/(app)/products/[productId]/page.tsx
Parallel data fetch for all four panel actions
03-platform/src/core/product-timeline/constants.ts
IP-004–007 product timeline event types
03-platform/src/core/audit/constants.ts
Audit entity names for attribute, variant, bundle, catalogue entities
Build-pack specs (4)
Implementation records appended to ip-04 through ip-07 markdown files
Intentionally not modified (see Section 12): src/db/schema/index.ts, drizzle/meta/_journal.json, src/db/seed.ts

4. Database Migrations
Tag	File	Tables
0032_bp003_ip004_product_attributes
0032_…sql
attribute_group, product_attribute_definition, product_attribute_option, product_attribute_definition_scope, product_attribute_assignment, attribute_timeline
0033_bp003_ip005_product_variants
0033_…sql
product_variant, product_variant_attribute, variant_timeline
0034_bp003_ip006_product_bundles
0034_…sql
product_bundle, product_bundle_item, bundle_timeline
0035_bp003_ip007_digital_catalogue
0035_…sql
catalogue_channel, product_catalogue_publication
Journal status: Drizzle journal currently ends at 0031_bp003_ip003_unit_engine. Migrations 0032–0035 exist as SQL files but are not registered in drizzle/meta/_journal.json.

5. Schema Changes
IP-004 — Attributes
Groups — hierarchical attribute grouping with industry filtering
Definitions — typed metadata (text, number, boolean, date, select, multi-select, etc.) with validation rules
Options — pick-list values for select types
Scopes — product-type / classification applicability
Assignments — per-product attribute values (JSONB)
Timeline — attribute entity lifecycle events
IP-005 — Variants
Variants — child offerings linked to parent product; unique code per business; status lifecycle
Variant attributes — override parent attribute values per variant
Timeline — variant lifecycle events
IP-006 — Bundles
Bundles — composite offerings; type, pricing strategy, availability placeholders
Bundle items — product membership with quantity; duplicate prevention
Timeline — bundle lifecycle and item change events
IP-007 — Digital Catalogue
Catalogue channels — reference table seeded with 8 channels (WEBSITE, MOBILE_APP, CUSTOMER_PORTAL, PARTNER_PORTAL, WHATSAPP, QR, API, MARKETPLACE)
Publications — per product+channel: published flag, visibility, schedule, featured/recommended, QR metadata (JSONB); unique index on (business_id, product_id, channel_id); optimistic locking via version
All entity tables follow platform conventions: business_id scoping, soft delete (deleted_at), audit columns, timestamps.

6. New Routes
Route	IP	Purpose
/products/attributes
IP-004
Attribute dashboard
/products/attributes/groups/new
IP-004
Create attribute group
/products/attributes/groups/[groupId]
IP-004
Group workspace
/products/attributes/definitions/new
IP-004
Create definition
/products/attributes/definitions/[definitionId]
IP-004
Definition workspace
/products/variants
IP-005
Variant dashboard
/products/variants/new
IP-005
Register variant
/products/variants/[variantId]
IP-005
Variant workspace
/products/bundles
IP-006
Bundle dashboard
/products/bundles/new
IP-006
Bundle registration wizard
/products/bundles/[bundleId]
IP-006
Bundle workspace
/products/catalogue
IP-007
Catalogue dashboard
/products/catalogue/[productId]
IP-007
Per-product catalogue workspace
Product Workspace tabs enabled: Attributes · Variants · Bundles · Catalogue (on existing /products/[productId])

7. Business Rules Implemented
IP-004 — Attributes
Attribute codes normalized (uppercase, trimmed)
Data-type validation (text length, number range, boolean, date, select option membership)
Definition/group status lifecycle (draft → active → archived)
Scope filtering — definitions apply only to matching product types/classifications
Industry Experience filters attribute groups by business industry
Required attribute enforcement on product save
Timeline + audit on group/definition/assignment changes
IP-005 — Variants
Parent product must be ACTIVE to create variants
Unique variant code per business
Variant fingerprint for duplicate detection (attribute override set)
Status transitions: DRAFT → ACTIVE → SUSPENDED → ARCHIVED (with guards)
Clone variant with auto-generated code suffix
Cascade archive: archiving parent product archives all active variants (via product-service)
Timeline + audit on variant lifecycle and attribute overrides
IP-006 — Bundles
Only ACTIVE products can be added as bundle items
Duplicate product entries in same bundle rejected
Bundle code normalization
Status lifecycle: DRAFT → ACTIVE → SUSPENDED → ARCHIVED
Bundle types: STARTER_KIT, PACKAGE, OFFER, SUBSCRIPTION_BUNDLE, CUSTOM
Pricing strategy and availability stored as configuration placeholders — no price calculation
Timeline + audit on bundle and item changes
IP-007 — Digital Catalogue
Only ACTIVE products publishable
Schedule validation: publish_from < publish_to when both set
One publication row per product+channel (unique constraint)
Visibility rules: Public, Registered Customers, Members, Employees, Partners, Business Customers, Customer Segment
Live/publication window computed from schedule + published flag
QR metadata stored in publication metadata (qrEnabled, qrSlug) — no QR generation service
Presentation layer only — no cart, checkout, pricing, or inventory
Service capability: getPublishedProducts(channelCode, featuredOnly) for future channel/API consumers
8. Industry Experience Support (ENG-003k)
Module	File	Behaviour
Attribute groups
attribute-group-filters.ts
Filters applicable groups by business industry
Variants
variant-terminology.ts
Industry labels (e.g. FINANCIAL → "SKU", HOSPITALITY → "Option")
Bundles
bundle-terminology.ts
Industry labels (e.g. FINANCIAL → "Product Packages", HOSPITALITY → "Offers")
Digital Catalogue
digital-catalogue-terminology.ts
Industry labels (e.g. FINANCIAL → "Products", HOSPITALITY → "Offers")
Labels flow into dashboard headings, workspace titles, and panel copy via respective *-ui-labels.ts modules.

9. Smoke Validation Results
Run from 03-platform/:

npx tsx scripts/bp003-ip004-product-attributes-smoke-validation.ts
npx tsx scripts/bp003-ip005-product-variants-smoke-validation.ts
npx tsx scripts/bp003-ip006-product-bundles-smoke-validation.ts
npx tsx scripts/bp003-ip007-digital-catalogue-smoke-validation.ts
IP	Result	Failure
IP-004
51 / 52
migration:0032_bp003_ip004_product_attributes — not in journal
IP-005
51 / 52
migration:0033_bp003_ip005_product_variants — not in journal
IP-006
53 / 54
migration:0034_bp003_ip006_product_bundles — not in journal
IP-007
38 / 39
migration:0035_bp003_ip007_digital_catalogue — not in journal
Combined
193 / 197
All 4 failures are journal registration only
All file-existence, rules, validators, timeline taxonomy, workspace tab, and service factory checks pass.

10. Quality Gates
Gate	Result
ESLint
Pass (0 errors; pre-existing warnings in unrelated IP-002 files)
Production build (npm run build)
Pass — all new routes compile and type-check
Smoke validation
193 / 197 (journal pending — see above)
Verified routes in build output include all IP-004–007 paths under /products/attributes, /products/variants, /products/bundles, /products/catalogue.

11. Known Limitations
Shared integration incomplete — schema exports, journal entries, and migration execution against Supabase are pending (Section 12).
No reference seed in seed.ts — attribute groups/definitions are created via UI; catalogue channels seeded in migration SQL only.
Pricing / inventory / commerce deferred — bundle pricing strategies, variant pricing, and catalogue display are structural/configuration only.
QR is metadata-only — slug stored; no QR image generation or deep-link service.
Channel previews are mock UI — Website/Mobile/WhatsApp layouts are placeholders, not production channel renderers.
No public API routes yet — getPublishedProducts() exists in service layer; HTTP/API endpoints deferred to channel consumers.
Bundle archive cascade — product archive cascades to variants only; bundles containing archived products are not auto-archived.
Customer segment visibility — visibility code exists; segment resolution logic deferred to future identity/segment engine.
Images, videos, documents in catalogue — display fields not wired; deferred to IP-009 (Documents) and media handling.
Drizzle schema index gap — without schema/index.ts exports, tooling that imports from the barrel may not see new tables until integration pass.
12. Integration Checklist
New migration files (ready to apply)
03-platform/drizzle/0032_bp003_ip004_product_attributes.sql
03-platform/drizzle/0033_bp003_ip005_product_variants.sql
03-platform/drizzle/0034_bp003_ip006_product_bundles.sql
03-platform/drizzle/0035_bp003_ip007_digital_catalogue.sql
Schema exports required — src/db/schema/index.ts
Add exports for all 14 new schema modules:

export { attributeGroup } from "./attribute-group";
export { productAttributeDefinition } from "./product-attribute-definition";
export { productAttributeOption } from "./product-attribute-option";
export { productAttributeDefinitionScope } from "./product-attribute-definition-scope";
export { productAttributeAssignment } from "./product-attribute-assignment";
export { attributeTimeline } from "./attribute-timeline";
export { productVariant } from "./product-variant";
export { productVariantAttribute } from "./product-variant-attribute";
export { variantTimeline } from "./variant-timeline";
export { productBundle } from "./product-bundle";
export { productBundleItem } from "./product-bundle-item";
export { bundleTimeline } from "./bundle-timeline";
export { catalogueChannel } from "./catalogue-channel";
export { productCataloguePublication } from "./product-catalogue-publication";
Journal entries required — drizzle/meta/_journal.json
Append after idx 31 (0031_bp003_ip003_unit_engine):

idx	tag
32
0032_bp003_ip004_product_attributes
33
0033_bp003_ip005_product_variants
34
0034_bp003_ip006_product_bundles
35
0035_bp003_ip007_digital_catalogue
Then run migrations against Supabase PostgreSQL:

cd 03-platform
npm run db:migrate   # or project-equivalent migrate command
Seed updates required
Data	Location	Action
Catalogue channels (8 rows)
Migration 0035 INSERT
No seed.ts change needed — applied with migration
Attribute groups / definitions
N/A
User-created via UI — no seed required
Variants / bundles
N/A
Business data — no seed required
Optional: If the team prefers all reference catalogues in seed.ts, migrate the catalogue_channel INSERT from 0035 into seed and leave migration as DDL-only. Current implementation follows the pattern of seeding reference channels in migration SQL.

Shared files intentionally not modified
Per .cursor/agents.md agent boundary rules:

File	Reason
03-platform/drizzle/meta/_journal.json
Shared integration — documented here
03-platform/src/db/schema/index.ts
Shared integration — documented here
03-platform/src/db/seed.ts
No seed changes required; catalogue channels in migration
Post-integration verification
After journal + schema exports + migrate:

Re-run all four smoke scripts — expect 52/52, 52/52, 54/54, 39/39
Confirm tables exist in Supabase: attribute_group, product_variant, product_bundle, catalogue_channel, etc.
Manual smoke: create attribute definition → assign on product → create variant → create bundle → publish to WEBSITE channel
Confirm product archive cascades variant archive
Handover complete. IP-004 through IP-007 are implemented on feature/bp003-catalogue. The remaining work is the shared integration pass (journal, schema index, migration execution) before runtime use in a connected environment. IP-008 has not been started.