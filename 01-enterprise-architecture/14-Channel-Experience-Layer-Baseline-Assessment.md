# 14 – Channel & Experience Layer Baseline Assessment

## Document Information

| Attribute | Value |
|-----------|-------|
| Document Name | Channel & Experience Layer Baseline Assessment |
| Version | 1.0 |
| Architecture Version | AV-1.12 (assessment baseline) |
| Assessment Date | 2026-09-02 |
| Scope | Platform implementation through BP-009; readiness for Web, Mobile/App, Staff, and Conversational channels |
| Audience | Product Owner, Solution Architects, Developers, AI Coding Assistants |
| Status | Assessment complete — no implementation in this document |

---

## Purpose

This document answers:

> **How ready is the current InverBrass implementation to become a multi-channel business operating platform, and exactly what foundation is still required before real businesses and their customers access capabilities through Web, App, Staff, and Conversational channels?**

The strategic principle under assessment:

> **InverBrass is the business operating platform. Web, App, Staff, and Conversational interfaces are channels into that platform — not separate business systems.**

This is a **readiness assessment only**. It does not redesign BP-003–BP-009 functionality and does not authorize implementation.

---

## Target Architecture (Reference)

```
CHANNELS
  Web · Mobile/App/PWA · Internal Staff · Conversational (WhatsApp, Messenger, …) · API integrations
        ↓
CHANNEL & EXPERIENCE LAYER
  Adapters · identity resolution · session/context · conversation · intent/action mapping
  capability registry · channel policy · authz · idempotency · escalation · messaging · audit
        ↓
DOMAIN CONTRACTS / CAPABILITIES
  CRM · Product/Offering · Sales · Payments · Inventory · Procurement · …
        ↓
CORE ENGINES / PLATFORM SERVICES
  Identity · configuration · workflow · audit · integration · documents · events · AI
```

---

## 1. Current Baseline

### 1.1 What exists today

InverBrass `03-platform` is a **Next.js 16 multi-tenant web application** with:

- **~98 Drizzle migrations** and domain modules for BP-001 through BP-009
- **Primary application boundary:** Next.js **Server Actions** (`"use server"`) — not a standalone REST/GraphQL API layer
- **No `route.ts` API handlers** found under `src/app` at assessment time
- **Domain services** orchestrating business logic with **ports/adapters** to other domains and core engines
- **Repositories** encapsulating database access; UI components do **not** import repositories directly
- **Hub-based navigation** (Dashboard, Parties, Products, CRM, Sales, Payments, Inventory, Procurement, Settings) via `platform-nav-config.ts`
- **Two public, token-based entry points** that behave like minimal external channels:
  - `/sourcing/respond/[token]` — supplier RFX response (BP-009 IP-04)
  - `/procurement/po/respond/[token]` — supplier PO acceptance (BP-009 IP-06)

There is **no dedicated Mobile/PWA app**, **no WhatsApp/Messenger integration**, and **no Staff-specific channel** separate from the authenticated web UI. Staff vs customer is distinguished only by **RBAC roles and permissions**, not by channel architecture.

### 1.2 Layer alignment vs platform blueprint

`13-platform-blueprint.md` defines six layers including Presentation, Application, Core Engines, Industry Experience (ENG-003k), Industry Editions, and Infrastructure.

| Blueprint layer | Current reality |
|-----------------|-----------------|
| Presentation (Web, Mobile PWA) | **Web only** — responsive Next.js pages; no PWA manifest/service worker |
| Application (services, APIs) | **Services yes; HTTP APIs largely absent** — server actions substitute for API endpoints |
| Core engines | **Partial** — workflow, payment, receipting, notification, document, audit, inventory-engine implemented as in-process adapters |
| Industry Experience (ENG-003k) | **Partial** — terminology helpers; no edition-bound channel templates |
| Channel & Experience Layer | **Not present as a named layer** — ad hoc patterns only (token portals, CRM communication logging) |

### 1.3 Domain implementation maturity (BP-003–BP-009)

| Build Pack | Module(s) | Service factories | Cross-domain contracts |
|------------|-----------|-------------------|------------------------|
| BP-003 Product | `product` | Product/offering/pricing services | Pricing consumed via `PricingResolutionAdapter` (CRM/commercial) |
| BP-006 Sales | `sales` | `createSalesOrderService`, delivery/exception services | `CommercialContractPort`, `PaymentReadyOrderContract`, `InventoryFulfilmentHandoffContract` |
| BP-007 Payments | `payments` | Obligation, initiation, allocation, invoice, receipt, refund, settlement, exception | ENG-006 `PaymentEnginePort`, idempotency repository |
| BP-008 Inventory | `inventory` | Foundation, receiving, reservation, transfer, adjustment, stocktake, traceability, controls | Consumes BP-006 fulfilment contract; `core/inventory-engine` quantity rules |
| BP-009 Procurement | `procurement` | 10+ services (foundation through analytics) | Party/document ports, BP-008 receiving handoff, AP handoff, token portal |

All five domains expose **`create*Service()` factories** from module `index.ts` files and enforce **tenant scope via `CurrentBusinessContext.businessId`**.

---

## 2. Compliant / Ready

Capabilities that already support channel-agnostic access **if** a proper channel gateway is introduced above them.

| Capability | Current implementation | Evidence | Why ready |
|------------|------------------------|----------|-----------|
| Domain service layer | Business logic in `*Service` classes, not in React components | e.g. `sales-order-service.ts`, `sourcing-service.ts`, `payment-initiation-service.ts` | Channels can call services without duplicating calculations |
| Ports & adapters | Cross-BP integration via explicit ports | `procurement/ports.ts`, `sales/adapters/*`, `inventory/adapters/sales-fulfilment-contract-adapter.ts` | Prevents duplicate masters and cross-domain table writes |
| Downstream handoff contracts | Typed contracts between domains | `PaymentReadyOrderContract`, `InventoryFulfilmentHandoffContract`, `CommercialTransactionContract` in `sales/types.ts`, `commercial/types.ts` | Stable integration boundaries for any channel initiating sales/payments |
| Commercial resolution (BP-005) | Deterministic resolution service + snapshot immutability | `commercial-resolution-actions.ts`, `commercial/types.ts` | Price/tax/discount logic not owned by UI; callable from any entry point |
| Workflow / approvals (ENG-005) | `WorkflowEnginePort` + in-process adapter | `core/workflow-engine/ports.ts`, pack-specific workflow adapters | Maker-checker is configuration-driven, not web-specific |
| Tenant isolation | `CurrentBusinessContext` + `businessId` on all transactional rows | `core/auth/services/business-context-service.ts` | Required for any channel |
| Party/customer identity (BP-002) | Single party master; CRM `crmId` separate from `partyId` | BP-001–004 integration certification | Channels resolve to party, not duplicate customer records |
| Audit trail (ENG-013) | `audit-service.ts`, pack audit helpers, `correlationId` support | `core/audit/helpers.ts`, `audit-history` schema | Channel-originated actions can be audited with correlation |
| Idempotency (critical paths) | Payment initiation, PO issue, receipt/AP handoffs | `payment-idempotency-repository.ts`, `purchase-order-service.ts`, `receiving-service.ts` | Safe retries for integration webhooks and conversational replays |
| Token-based external access (proto-channel) | Supplier portals without platform login | `getSupplierPortalAction`, `submitQuoteByToken`, `middleware.ts` PUBLIC_PATHS | Proves domain services can run outside authenticated staff session |
| Permission model (schema) | Seeded permissions per module | `db/seeds/permissions.ts`, `PROCUREMENT_PERMISSIONS`, etc. | Foundation for channel → capability policy |
| Notification port (ENG-009) | `NotificationEnginePort` | `core/notification-engine/ports.ts` | Outbound messaging can be adapter-swapped |
| Payment engine port (ENG-006) | Provider/channel catalogue + initiation adapter | `core/payment-engine/ports.ts`, `payment-channel` schema | External payment rails already abstracted (distinct from *experience* channels) |
| Inventory engine | Quantity/movement rules centralized | `core/inventory-engine/` | Stock calculations not duplicated in UI |
| Architecture governance | Ownership locks AV-1.8–AV-1.12, engine catalog AV-1.5 | `01b-Architecture-Versions.md`, `02-Platform-Module-Catalog.md` | Prevents conversational layer from creating duplicate ledgers |
| AI governance principle | Rules before AI; human authority | `08-Enterprise-Intelligence-Architecture.md` | Aligns with “AI translates intent, domain executes” target |

---

## 3. Partial / Gap

Areas that exist but need change before multi-channel production use.

| Area | Current state | Gap | Impact | Recommended change |
|------|---------------|-----|--------|-------------------|
| Application API boundary | Server Actions only | No channel-neutral HTTP/API contract; actions are Next.js-coupled | Mobile, WhatsApp webhooks, and partner integrations cannot consume capabilities without new coupling | Introduce **Channel Gateway** exposing canonical commands over HTTP (internal first); keep server actions as one channel adapter |
| API Standards vs code | `05-API-Standards.md` mandates API-first | Implementation predates full API layer | Documentation/code drift; integrators lack stable endpoints | Align implementation to API standards via gateway + OpenAPI for capability commands |
| Authorization at action layer | Procurement actions assign `ALL_PROCUREMENT_PERMISSIONS` | RBAC bypass at web entry point | Any staff web user effectively has full procurement power; conversational channel would inherit same flaw | Resolve real permissions from ENG-002 in **all** server actions before any external channel |
| Authorization in sales/inventory | No `assertPermission` pattern found in sales/inventory services | Weaker service-layer RBAC than procurement | Channel could invoke operations staff should not perform | Extend permission checks in service layer consistently |
| Service return types | Rich **workspace views** (e.g. `EvaluationWorkspaceView`) | UI-oriented DTOs leak into service responses | Channels receive web-specific shapes; unstable contracts | Split **command results** (channel-safe) from **presentation views** (web-only) |
| ENG-009 notifications | `InProcessNotificationAdapter` only | No live email/SMS/WhatsApp delivery | Conversational and supplier journeys cannot notify in production | Wire provider adapters; separate *experience* messaging from *payment channel* catalogue |
| ENG-003e integration | Payment initiation adapters exist | No generic webhook ingress for conversational providers | WhatsApp cannot post inbound events | Add integration ingress in engine layer, not in sales/inventory domains |
| ENG-003d events | Planned | No event bus for cross-channel journey continuity | Hard to resume WhatsApp → web on same transaction | Introduce event ingestion for channel/session lifecycle (does not replace domain state) |
| CRM “channel” | `crm_communication_channel` reference + interaction log | CRM **logging taxonomy**, not experience channel gateway | Naming collision with target Channel Layer | Treat CRM channel codes as *interaction metadata*; do not confuse with Channel Adapter |
| Product `catalogue_channel` | Digital catalogue publication channel | Product distribution dimension, not user experience channel | Same naming collision risk | Document distinction in capability registry |
| Commercial `salesChannel` field | Optional string on resolution request | Business metadata only | Not a policy engine | Map to channel context in future registry; no logic today |
| Public token security | Token binding for supplier portals | No general **channel identity → party** model for end customers | Cannot link WhatsApp MSISDN to CRM customer safely | Build channel identity resolution on top of BP-002 party/contact, not parallel customer store |
| Idempotency coverage | Strong in payments/procurement handoffs | Not universal (e.g. all sales creates, inventory adjustments) | Conversational retries may duplicate transactions | Extend idempotency keys to all channel-exposed mutating commands |
| Staff vs Web | Same routes and components | No staff-optimized channel profile | Acceptable for v1 web; not true multi-channel | Optional staff channel adapter (same capabilities, different presentation policy) |
| Mobile / PWA | Responsive web | No installable PWA, no native app shell | “App” channel missing | PWA or native app as presentation adapter over same gateway |
| Cross-channel journey | Lifecycle pages within procurement (`/procurement/lifecycle/...`) | **Intra-web** traceability only | WhatsApp → web cannot automatically resume context | Cross-channel context store keyed by business transaction anchors |
| ENG-003k Industry Experience | Partial terminology | No channel-specific menu/capability visibility | All channels would expose same capability surface | Extend configuration: **Channel → Capability → Policy** |

---

## 4. Missing

Confirmed absent from repository at assessment time (not assumed).

| Capability | Status | Notes |
|------------|--------|-------|
| **Channel Adapter Contract** | Missing | No `ChannelAdapterPort`, no normalized inbound envelope |
| **Channel Gateway / Experience Layer** | Missing | No module or engine owning channel orchestration |
| **Canonical Interaction / Business Intent Contract** | Missing | No `STOCK_AVAILABILITY_QUERY`, `CREATE_SALE`, etc. intent registry |
| **Capability Registry** | Missing | No machine-readable map of invocable business capabilities |
| **Channel → Capability Policy** | Missing | Cannot configure “WhatsApp: browse=yes, refund=no” |
| **Conversation / session management** | Missing | No conversation state machine for multi-turn dialog |
| **Channel identity resolution** | Missing | No canonical link: channel address (phone/social ID) → party → tenant |
| **Cross-channel context / journey store** | Missing | No shared session spanning WhatsApp, web, app |
| **Human escalation / handoff** | Missing | No queue for bot → staff takeover with context |
| **Messaging abstraction (conversational)** | Missing | ENG-009 covers document delivery slice only, not conversational reply templates |
| **Conversational / AI orchestration boundary** | Missing | No NLU → intent → domain command pipeline (ENG-012 not implemented) |
| **REST/GraphQL public API layer** | Missing | `src/app/api` not populated for business capabilities |
| **Offline sync channel (ENG-014)** | Missing | Per API standards principle; not implemented |
| **Dedicated Mobile App / PWA channel** | Missing | No manifest, service worker, or app shell |

### What is *not* missing (avoid false gaps)

- **Domain business logic** for BP-003–BP-009 — implemented in services
- **Payment provider “channels”** — exist but mean **payment rail**, not WhatsApp/Web experience channel
- **Supplier token portals** — exist as **narrow prototypes**, not a general channel framework
- **CRM communication logging** — exists for staff CRM workspace, not conversational orchestration

---

## 5. Architectural Risks

| Risk | Severity | Evidence / concern |
|------|----------|-------------------|
| **Server Actions as only boundary** | High | New channels will duplicate action wrappers or bypass services |
| **UI-shaped service responses** | Medium | Workspace views couple domain to web presentation |
| **Permission bypass in actions** | High | `ALL_PROCUREMENT_PERMISSIONS` in procurement `*-actions.ts` |
| **Inconsistent service-layer RBAC** | Medium | Procurement has `assertPermission`; sales/inventory grep shows none |
| **No API versioning** | Medium | `05-API-Standards.md` requires it; no implementation |
| **Notification stub** | High | Conversational and supplier flows cannot complete in production |
| **Naming collision: “channel”** | Low | Payment channel, catalogue channel, CRM channel type vs experience channel |
| **Duplicate logic if channels built in domains** | High | Without gateway, WhatsApp logic will land inside `sales/`, `inventory/`, etc. |
| **AI bypassing domain** | High (future) | No intent boundary today; risk if conversational built without registry |
| **Missing universal idempotency** | Medium | Retry-sensitive channels (WhatsApp, webhooks) need keys on all mutations |
| **No correlation propagation from channels** | Low | Audit supports `correlationId`; not wired from inbound channel requests |

### Principles compliance check

| Principle | Verdict |
|-----------|---------|
| Channels must not own business logic | **Compliant at service layer** — risk at presentation if channels skip services |
| AI is not the business engine | **Compliant** — no AI execution path exists yet |
| Capabilities channel-agnostic | **Partial** — logic yes, access boundary no |
| Domain ownership intact | **Compliant** — ports/adapters enforce BP-002/008/010 boundaries |
| Tenant isolation, audit, workflow | **Mostly compliant** — RBAC enforcement incomplete at web boundary |

---

## 6. Recommended Next Steps

Smallest logical sequence ( **do not implement in this assessment** ):

| Step | Action | Rationale |
|------|--------|-----------|
| 1 | **Freeze Channel & Experience architecture** | Add AV-1.x entry; assign engine/pack ID (see §8); resolve “channel” terminology |
| 2 | **Define Channel Adapter Contract** | Normalized inbound: `{ channelId, channelUserRef, businessId?, correlationId, idempotencyKey, intent, payload }` |
| 3 | **Define Interaction / Business Intent Contract** | Canonical intents mapped 1:1 to domain service commands — not free-text in domains |
| 4 | **Define Capability Registry** | Machine-readable catalog: capability ID, owning BP, service entrypoint, mutability, required permissions |
| 5 | **Define Channel → Capability Policy** | Configuration under ENG-003a: per channel, per capability allow/deny/approval-required |
| 6 | **Identity / session / context model** | Channel identity → BP-002 party/contact; session links to transaction anchors (orderId, quotationId, …) |
| 7 | **Expose BP-003–BP-009 through controlled commands** | Thin gateway delegates to existing `create*Service()` — **no domain rewrites** |
| 8 | **Harden RBAC + idempotency** | Fix action-layer permission bypass; extend idempotency to channel-exposed mutations |
| 9 | **First conversational channel: WhatsApp** | Webhook ingress → adapter → intent → domain; outbound via ENG-009 provider adapter |
| 10 | **Regression** | Existing web smoke suites (BP-001–009) + new channel contract tests |
| 11 | **Expand channels** | Messenger, Instagram, PWA shell — new adapters only |
| 12 | **AI/NLU layer last** | ENG-012 orchestration **above** intent contract; never writes domain state directly |

### Priority capabilities for first channel (suggested)

| Intent (example) | Owning domain | Existing service evidence |
|------------------|---------------|---------------------------|
| `CATALOGUE_BROWSE` | BP-003 | Product/digital catalogue services |
| `STOCK_AVAILABILITY_QUERY` | BP-008 | `listAvailability` in reservation service |
| `PRICE_QUOTE` | BP-005 + BP-004 | Commercial resolution + quotation services |
| `CREATE_SALE` | BP-006 | `SalesOrderService` |
| `INITIATE_PAYMENT` | BP-007 | `PaymentInitiationService` |
| `ORDER_STATUS_QUERY` | BP-006 | `SalesOrderService.get` |
| `CREATE_CUSTOMER` | BP-002 + BP-004 | Party + CRM services |
| `RAISE_CASE` | BP-004 | `crm-case` service |

Procurement supplier flows already demonstrate **token-channel → service** for BP-009; do not rebuild — **generalize the pattern**.

---

## 7. Domain Contract Assessment (BP-003, 006, 007, 008, 009)

| Domain | Public entry | Contracts / adapters | Direct DB from UI | Channel-ready? |
|--------|--------------|----------------------|-------------------|----------------|
| **BP-003 Product** | Server actions → product services | Pricing via adapter from CRM/commercial | No | **Partial** — needs gateway + stable DTOs |
| **BP-006 Sales** | `sales-order-actions.ts` → `SalesOrderService` | Commercial, fulfilment, payment-ready contracts | No | **Partial** — strong services, weak API boundary |
| **BP-007 Payments** | `payment-*-actions.ts` → payment services | ENG-006 port, idempotency | No | **Partial** — best idempotency; needs webhook ingress |
| **BP-008 Inventory** | `inventory-*-actions.ts` → inventory services | BP-006 fulfilment consumer; inventory-engine | No | **Partial** — availability query exists |
| **BP-009 Procurement** | `procurement/*-actions.ts` + token actions | Party ports, BP-008/BP-007 handoffs, token portal | No | **Partial** — best external-channel prototype |

---

## 8. Proposed Next Implementation Package

### Recommendation

Introduce a **platform-level Channel & Experience capability** rather than scattering across BP-003–009.

| Option | ID | Recommendation |
|--------|-----|----------------|
| **A. New sub-engine** | **ENG-003o — Channel & Experience Engine** | **Preferred** — fits AV-1.5 lock; configuration + orchestration under ENG-003 family |
| B. New Build Pack | BP-014 Channel & Experience | Heavier; channels are horizontal, not a business domain |
| C. Extend ENG-003e only | Integration Engine | Insufficient — lacks intent, policy, conversation, cross-channel context |

Record **ENG-003o** in `02-Platform-Module-Catalog.md` §3 when implementation is approved (not in this assessment).

### Proposed IP structure (implementation package sketch)

| IP | Scope |
|----|-------|
| **IP-01** | Channel Adapter Contract + Gateway skeleton (HTTP/webhook ingress, correlation, idempotency) |
| **IP-02** | Capability Registry + Channel → Capability Policy (ENG-003a configuration) |
| **IP-03** | Channel Identity Resolution (channel address → party/contact → tenant) |
| **IP-04** | Session, conversation state, cross-channel context store |
| **IP-05** | First conversational adapter — WhatsApp (inbound/outbound via ENG-009/ENG-003e) |
| **IP-06** | Intent catalog v1 + mapping to BP-003/006/007/008 domain commands |
| **IP-07** | Human escalation / staff handoff (ENG-003n integration) |
| **IP-08** | PWA / mobile shell adapter (presentation only) |
| **IP-09** | Certification — web regression + channel contract tests |

**Explicit non-scope for ENG-003o:** inventory calculations, payment state machines, procurement lifecycle, pricing rules — all remain in owning BPs.

---

## Overall Readiness

### Rating: **READY WITH GAPS**

### Rationale

**Ready** because:

- BP-001–BP-009 domain logic is implemented in **service layers with ports, adapters, tenant isolation, workflow, audit, and handoff contracts**
- The platform already demonstrates **channel-like access** (supplier token portals) calling domain services without duplicating procurement logic
- Core engines (workflow, payment, notification, document, audit) provide **adapter-shaped extension points**
- Architecture governance (AV-1.5–AV-1.12) **prevents** the most dangerous duplication (second inventory ledger, supplier master, payment engine)

**Gaps** because:

- There is **no Channel & Experience Layer** — only web server actions and two token pages
- **No API/gateway**, **no capability registry**, **no intent model**, **no conversational session**, **no channel identity resolution**
- **RBAC is bypassed** at several web action entry points
- **ENG-009/003e/012** are not production-ready for real messaging or AI orchestration
- **Mobile/App channel** does not exist beyond responsive HTML

The platform is **architecturally well-suited for multi-channel evolution** at the **domain layer**, but **not yet ready to connect real customer conversational channels at scale** without the foundation in §6.

---

## References

- [01 – Enterprise Solution Architecture](./01-Enterprise-Solution-Architecture.md)
- [01b – Architecture Versions](./01b-Architecture-Versions.md)
- [02 – Platform Module Catalog](./02-Platform-Module-Catalog.md)
- [05 – API Standards & Integration Architecture](./05-API-Standards.md)
- [08 – Enterprise Intelligence Architecture](./08-Enterprise-Intelligence-Architecture.md)
- [13 – Platform Blueprint](./13-platform-blueprint.md)
- [11 – Development Roadmap](./11-Development-Roadmap.md)
- `03-platform/docs/certification/BP-009-PROCUREMENT-CERTIFICATION.md`

---

*Assessment performed against repository state including BP-009 certification (359/359 smoke checks). No code changes were made as part of this document.*
