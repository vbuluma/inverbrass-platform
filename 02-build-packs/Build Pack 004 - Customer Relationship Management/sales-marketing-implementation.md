# BP-004 Sales & Marketing — Implementation Handover

**Agent:** BP-004 Sales & Marketing Engineer  
**Branch:** `bp004-sales-marketing`  
**Owned IPs:** IP-10 (Quotations), IP-11 (Campaigns), IP-12 (CRM Analytics)  
**Status:** FINAL REMEDIATION COMPLETE — READY TO FREEZE  
**Date:** 2026-08-10

---

## 1. Ownership Boundaries

| IP | Owner | This agent |
|----|-------|------------|
| IP-01 Customer Profile / 360 shell | CRM Core | Publishes contribution contracts only |
| IP-02 Lead Management | CRM Core | Consumes via `LeadAttributionAdapter` stub |
| IP-03 Opportunity Management | CRM Core | Consumes via UUID refs + `OpportunityHandoffAdapter` stub |
| IP-04 Account / Contact | CRM Core | Optional UUID refs on quotation/sales order |
| IP-05–IP-09 | CRM Core / related | Analytics pending widgets only |
| **IP-10 Quotations** | **Sales & Marketing** | **Implemented** |
| **IP-11 Campaigns** | **Sales & Marketing** | **Implemented** |
| **IP-12 Analytics** | **Sales & Marketing** | **Implemented (capstone consumer)** |

**Never duplicated:** Party master, CRM record, Lead, Opportunity, Party Groups, Consent store, Pricing catalogue.

---

## 2. Lifecycle Principle (Identity)

```
Party (BP-002) — authoritative identity
  → CRM record (IP-01) — authoritative relationship layer
    → Lead (IP-02)
      → Opportunity (IP-03)
        → Quotation (IP-10)
          → Accepted → Sales Order stub → BP-006 fulfilment
```

- Existing Party → **reuse**
- Existing CRM record → **reuse** (`crmRecordId` UUID)
- Campaign conversion → **IP-02 Lead service** (adapter; stub until merge)
- Quotation opportunity link → **IP-03 contract** (`opportunityId` UUID + handoff adapter)

**Channel / onboarding readiness (not implemented here):**  
Self-service, assisted, hybrid, partner/API, WhatsApp, Contact Centre, Social, Web, Mobile must all preserve Party → CRM → Lead/Opportunity/Quotation without creating duplicate customers. See `CRM_CHANNEL_IDENTITY_PRINCIPLE` in `customer-360-contracts.ts`.

---

## 3. IP-10 Quotation Implementation

### Delivered
- Schema: `quotation`, `quotation_version`, `quotation_line`, `sales_order`, `sales_order_line`
- Migrations: `0042`, `0043` (feature branch; journal deferred)
- Lifecycle: Draft → (Approval) → Sent → Accepted / Rejected / Expired; revise path
- Pricing: `PricingResolutionAdapter` → BP-003 (no CRM price lists)
- Versions immutable after Sent
- Expiry: `valid_until` + auto-expiry; expired cannot accept/convert
- Approval: threshold-based v1 (`DEFAULT_QUOTATION_APPROVAL_THRESHOLD`); ENG-005-ready status model
- Acceptance channel **metadata**: `metadata.acceptanceChannel` + `acceptedAt` (CRM default; Portal/Email/API/WhatsApp reserved — not implemented)
- Document: HTML printable via `QuotationDocumentAdapter` (PDF = ENG-015 future)
- Sales order: handoff stub only; fulfilment outside IP-10
- UI: `/quotations`, `/quotations/new`, `/quotations/[id]`
- Timeline + audit events

### Customer 360 contribution (`domain: "quotations"`)
Stable IDs in `CRM_CUSTOMER_360_*` / `customer-360-contracts.ts`:
- Widgets: outstanding, pending_acceptance, expired, **accepted**
- Insights: total quoted value, awaiting response
- Quick actions: view latest, create quotation
- Timeline event types: `CRM_TIMELINE_EVENT_TYPES`

IP-01 mounts these; Sales & Marketing does **not** render a second 360 shell.

---

## 4. IP-11 Campaign Implementation

### Delivered
- Schema: `campaign`, `campaign_member` — migration `0044`
- Audience: BP-002 Party Group reference only (no dynamic segments)
- Consent: BP-002 communication preferences via `CampaignConsentAdapter` before outreach
- Outreach: ENG-009 stub (`ManualCampaignOutreachAdapter`)
- Member statuses: Targeted → Sent → Responded → Converted / Opted out
- Lead attribution: `LeadAttributionAdapter` → stub until IP-02; **no Lead tables here**
- ROI summary: member rates + budget efficiency; pipeline value = 0 until IP-03
- UI: `/campaigns`, `/campaigns/new`, `/campaigns/[id]`

### Customer 360 contribution (`domain: "campaigns"`)
- Widgets: active memberships, recent responses, last touch
- Insights: response rate, attributed leads
- Quick action: log response
- Timeline: `CRM_CAMPAIGN_TIMELINE_EVENT_TYPES`

### IP-02 merge contract
```
Campaign response → LeadAttributionAdapter → IP-02 Lead service
  → Lead with campaign attribution → campaign_member.lead_id
```

---

## 5. IP-12 Analytics Implementation

Capstone **consumer** — does not own operational masters.

### LIVE / available
- Quotation KPIs (quoted value, open, accepted, acceptance rate)
- Campaign KPIs (response rate, budget efficiency proxy)
- Customer health / dormancy / churn risk (rule-based v1)
- Relationship value from quotations
- CSV export + executive dashboard `/crm-analytics`

### PENDING (graceful empty — not faked)
- Pipeline by stage / weighted forecast / win rate → IP-03
- Lead conversion rate → IP-02
- Case / visit / SLA sections → IP-05–09 / ENG-003n

### Customer 360 contribution (`domain: "analytics"`)
- Widgets: health_score, churn_risk, dormancy, relationship_value, open_pipeline (pending)
- Insight: health_summary
- Quick actions: view dashboard, export
- `futureExtensionZones`: `analytics.ai_summary`, `analytics.next_best_action` (ENG-012 / ENG-004 — **not implemented**)

---

## 6. Future Customer 360 Sales Strip (document only)

Composed by **IP-01** from other IPs — not a second shell:

| Slot | Source |
|------|--------|
| Current opportunity / probability | IP-03 |
| Outstanding quotation | IP-10 |
| Recent campaign engagement | IP-11 |
| Next sales action | IP-05 |
| Sales health | IP-12 |

IDs: `CRM_SALES_STRIP_SLOTS` in `customer-360-contracts.ts`.

---

## 7. Quality Gates (final remediation)

Run from `03-platform/` on 2026-08-10:

| Gate | Command | Result |
|------|---------|--------|
| Lint | `npm run lint` | **PASS** — 0 errors (22 pre-existing product-module warnings) |
| Typecheck | `npm run typecheck` | **PASS** |
| Build | `npm run build` | **PASS** — routes include `/quotations*`, `/campaigns*`, `/crm-analytics` |
| Smoke IP-10 | `npx tsx scripts/bp004-ip010-quotation-smoke-validation.ts` | **PASS** — 63/65 (2 journal FAILs non-blocking; exit 0) |
| Smoke IP-11 | `npx tsx scripts/bp004-ip011-campaign-smoke-validation.ts` | **PASS** — 29/30 (1 journal FAIL non-blocking; exit 0) |
| Smoke IP-12 | `npx tsx scripts/bp004-ip012-crm-analytics-smoke-validation.ts` | **PASS** — 20/21 (1 journal FAIL non-blocking; exit 0) |

---

## 8. Deferred (intentional)

| Item | Owner |
|------|-------|
| PDF quotation templates | ENG-015 |
| Multi-tier approval workflow | ENG-005 |
| ENG-009 campaign blast | ENG-009 |
| Dynamic campaign segments | Future IP-11 |
| Customer portal / digital accept channels | Future CX |
| WhatsApp / Social / Contact Centre connectors | External integrations |
| Next Best Action / AI insights | ENG-004 / ENG-012 |
| Explicit `valid_from` column | Optional enhancement |
| Version comparison UI | Enhancement (versions already stored) |
| Opportunity / Lead operational modules | IP-02 / IP-03 |

---

## 9. Integration Manager Handover

Do **not** modify on feature branch (unless governance authorizes):

| Item | Files / tags |
|------|----------------|
| Drizzle journal | `0042_bp004_ip010_quotation_foundation`, `0043_bp004_ip010_sales_order_approval`, `0044_bp004_ip011_campaign_foundation`, `0045_bp004_ip012_crm_analytics` |
| Schema exports | `quotation.ts`, `sales-order.ts`, `campaign.ts`, `crm-analytics.ts` → `src/db/schema/index.ts` |
| Audit constants | Register CRM entity names in shared `core/audit/constants.ts` if required |
| Navigation | Quotations, Campaigns, CRM Analytics already added in `platform-nav-config.ts` (feature branch) |
| Timeline taxonomy | Quotation + campaign event type codes published; optional shared registry update |
| Merge | Coordinate develop merge after CRM Core IP-01/02/03 readiness |

### IP-01 wiring checklist
- Mount `getQuotationCustomer360Action` / `getCampaignCustomer360Action` / `getCrmCustomerAnalyticsAction`
- Use stable IDs from `customer-360-contracts.ts`
- Tabs: `quotations`, `campaigns`, `analytics`

### IP-02 wiring checklist
- Replace `StubLeadAttributionAdapter` factory with IP-02-backed adapter

### IP-03 wiring checklist
- Replace `NoOpOpportunityHandoffAdapter` with stage update on quote accept / sales order
- Feed pipeline KPIs into IP-12

---

## 10. Key Module Paths

```
03-platform/src/modules/crm/
├── customer-360-contracts.ts      # Stable IDs + sales strip + channel principle
├── quotation/                     # IP-10
├── campaign/                      # IP-11
├── analytics/                     # IP-12
├── adapters/
│   ├── pricing-resolution-adapter.ts
│   ├── opportunity-handoff-adapter.ts
│   ├── quotation-document-adapter.ts
│   ├── campaign-outreach-adapter.ts
│   ├── campaign-consent-adapter.ts
│   └── lead-attribution-adapter.ts
├── actions/
└── components/
```

---

## 11. Closure Statement

Sales & Marketing IP-10 / IP-11 / IP-12 are implementation-complete for v1 scope, integration-ready via adapters and contribution contracts, and frozen pending Integration Manager registration and CRM Core merges.
