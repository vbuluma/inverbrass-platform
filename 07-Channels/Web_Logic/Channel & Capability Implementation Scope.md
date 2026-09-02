# IP-01 — Customer Web Channel — Journey & Capability Slice

## Document Information

| Attribute | Value |
|-----------|-------|
| Document Name | Customer Web Channel — Journey & Capability Slice |
| Parent Scope | [07-Channels — Channels & Experience Scope](../01-Channels%20%26%20Experience%20Scope.md) |
| Engine | **ENG-003o** — Channel & Experience Engine |
| Architecture Version | AV-1.13 |
| Status | **Design frozen** — implementation gate; no production code in this phase |
| Audience | Product Owner, Solution Architects, Developers, AI Coding Assistants |
| Implementation Location (future) | `03-platform/src/app/(public)/store/`, `03-platform/src/core/channel-experience/` |

---

## Purpose

This document freezes the **first Customer Web vertical slice** for InverBrass: a simple SME commerce journey where an end customer discovers a business, browses offerings, checks price and stock, creates a sale, initiates payment, and receives order confirmation.

**Customer Web is the first concrete implementation of ENG-003o's channel architecture.**

It proves that the same Channel & Experience Layer can later support Customer App, WhatsApp, Messenger, Instagram, and other conversational channels **without rewriting BP-003–BP-009**.

> **InverBrass is the business operating platform. Staff Web and Customer Web are two distinct presentation experiences over the same Web channel infrastructure. Channels do not own business logic.**

---

## Customer Web Scope

### In scope (MVP slice)

| Area | Scope |
|------|-------|
| Presentation | New Customer Web routes under `(public)/store/[businessCode]/…` |
| Journey | Discover → Browse → Price → Stock → Order → Pay → Confirm |
| Capabilities | 6 transactional capabilities (see §8) |
| Identity | Guest-first checkout with optional customer account |
| Tenant binding | Explicit business resolution from URL |
| Transport | Next.js RSC / Server Actions behind Customer Web Adapter + Channel Gateway |
| Domains consumed | BP-003, BP-005, BP-006, BP-007, BP-008 (read-only availability) |

### Out of scope (non-goals)

- WhatsApp, Messenger, Instagram, AI chatbot, voice, conversational orchestration
- Native mobile app / broad PWA
- Procurement, supplier, or staff workspace journeys
- Full customer CRM portal
- Broad IAM redesign or second Party master
- Public REST/API layer (introduce only when mobile/partner requirement exists)
- Customer-specific copies of Sales, Inventory, or Payments domains
- Refunds, adjustments, governance, or administrative configuration via Customer Web

---

## Staff Web vs Customer Web Distinction

Both experiences share **ENG-003o infrastructure** (Gateway, Registry, Policy, Session, Identity contracts) but must **never** share presentation routes or actor assumptions.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SHARED: ENG-003o Web Infrastructure             │
│   Channel Gateway · Capability Registry · Session/Correlation · Audit  │
└─────────────────────────────────────────────────────────────────────────┘
              │                                    │
              ▼                                    ▼
┌──────────────────────────┐        ┌──────────────────────────┐
│       STAFF WEB          │        │      CUSTOMER WEB        │
│  Route group:            │        │  Route group:            │
│  (authenticated)/(app)   │        │  (public)/store/[code]   │
│                          │        │                          │
│  Actor: STAFF            │        │  Actor: CUSTOMER /       │
│                          │        │         ANONYMOUS (guest)│
│  Identity:               │        │  Identity:               │
│  Platform User           │        │  Party (optional)        │
│  + Business Membership   │        │  + Guest session         │
│  + RBAC (ENG-002)        │        │  + Customer Web Policy   │
│                          │        │    (NOT staff RBAC)      │
│  Capabilities:           │        │  Capabilities:           │
│  Workspace + operational │        │  Customer allow-list     │
│  domains (BP-002–009)    │        │  only (6 MVP caps)       │
└──────────────────────────┘        └──────────────────────────┘
              │                                    │
              └────────────────┬───────────────────┘
                               ▼
              ┌────────────────────────────────────┐
              │   DOMAIN SERVICES (authoritative)  │
              │   BP-003 · BP-005 · BP-006 ·       │
              │   BP-007 · BP-008 · BP-002 Party   │
              └────────────────────────────────────┘
```

| Dimension | Staff Web | Customer Web |
|-----------|-----------|--------------|
| Route prefix | `/sales`, `/products`, `/procurement`, … | `/store/[businessCode]/…` |
| Auth entry | `/login` → `/home` → business selection | Guest session; optional `/store/[code]/account` |
| Tenant source | Staff business-context cookie | URL segment + server validation |
| Authorization | ENG-002 RBAC via business membership | Customer Web Policy allow-list |
| Actor type | `STAFF` | `CUSTOMER` or `ANONYMOUS` |
| Navigation | Hub-based operational workspace | Mobile-first storefront (≤7 screens) |
| Domain entry | `require*ChannelContext()` (staff) | `requireCustomerWebChannelContext()` (future) |

**Hard rule:** Customer Web must **not** expose or reuse staff routes such as `/sales`, `/products`, `/procurement`, or `/inventory`. The staff workspace is not a storefront.

---

## Actor Model

```
Customer (person or organisation buying from a business)
        ↓
Party (BP-002 canonical master — single customer identity)
        ↓
Party Role: CUSTOMER (per business, via party_role)
        ↓
Business / Tenant (business.id scoped by businessCode in URL)
        ↓
Customer Web Session (channel = WEB, actorType = CUSTOMER | ANONYMOUS)
        ↓
Customer Web Policy → Capability allow-list
        ↓
Domain capability execution
```

| Actor | Description | Party required | Platform user required |
|-------|-------------|----------------|------------------------|
| **Guest customer** | Anonymous browser session bound to one business | No (created at checkout if needed) | No |
| **Authenticated customer** | Returning buyer with customer account linked to Party | Yes | Yes (customer account, not staff membership) |
| **Staff** | Business operator | N/A on Customer Web | N/A — blocked from customer policy path for mutations |

Staff users may browse a public storefront for preview, but **staff RBAC must not authorize Customer Web capability execution**. Staff transact through Staff Web only.

---

## Customer Identity Model

### Canonical identity (no parallel customer store)

BP-002 **Party** remains the single customer master. CRM `crmId` and `partyId` relationships are unchanged.

```
Customer Web Identity
├── actorType: ANONYMOUS | CUSTOMER
├── guestSessionId: string (always, for correlation)
├── platformUserId: string | null (customer account only)
├── partyId: string | null (resolved after checkout or sign-in)
├── externalIdentityKey: string | null (future: phone, WhatsApp MSISDN)
├── businessId: string (tenant — mandatory, from URL)
├── businessCode: string (URL key — validated against business.code)
└── customerPermissionCodes: readonly string[] (Customer Web policy grants, NOT staff RBAC)
```

### Party linkage rules

| Event | Party behaviour |
|-------|-----------------|
| Guest browse / price / stock | No Party required |
| Guest checkout | Create or match Party by contact detail (phone/email); assign `party_role` CUSTOMER for tenant |
| Customer sign-in / register | Platform user linked to existing Party via BP-002 contact identity; no business membership |
| Returning authenticated customer | Resolve `partyId` from customer account → Party → active CUSTOMER role for tenant |

### MVP recommendation: Guest + optional account (Option B)

| Option | MVP verdict |
|--------|-------------|
| A — Authenticated only | **Rejected** — excessive friction for SME first purchase |
| B — Guest + optional account | **Recommended for MVP** |
| C — Both (explicit dual mode) | **Future** — same architecture; MVP implements B first |

**Rationale:** SME commerce conversion depends on low-friction first transaction. Guest checkout with optional account creation post-purchase (or before payment if the business requires it) matches the baseline journey without blocking anonymous discovery. Authenticated customers gain order history via `VIEW_ORDER` scoped to their `partyId`. Option C is architecturally supported but MVP delivery focuses on guest-first with optional sign-in.

---

## Tenant / Business Binding

### Entry model

Customer Web entry is **always tenant-explicit** via URL:

```
/store/[businessCode]/...
```

Where `businessCode` maps to `business.code` (unique, existing column — no new slug table required for MVP).

### Entry paths (MVP)

| Entry method | URL pattern | Tenant binding |
|--------------|-------------|--------------|
| Direct link / QR | `https://platform.example/store/ACME001` | `businessCode` → `business.id` |
| Marketing share | Same | Same |
| Staff-shared link | Same | Same |

### Deferred entry paths (architecture-ready, not MVP)

| Entry method | Notes |
|--------------|-------|
| Custom subdomain | `acme.platform.example` → resolve to `businessCode` via DNS/config table |
| Custom domain | CNAME mapping — ENG-003a configuration |
| Deep link with token | `/store/[businessCode]?ref=campaign` — metadata only; tenant still from path |

### Tenant resolution pipeline

```
HTTP Request: /store/ACME001/catalogue
        ↓
Middleware: allow public (no staff session required)
        ↓
Layout loader: resolveTenant(businessCode)
        ├── Lookup business by code
        ├── Reject if business inactive
        └── Bind businessId to Customer Web session
        ↓
All capability invocations use resolved businessId
        ↓
Cross-tenant access: DENY (businessId mismatch → 403)
```

**Security invariant:** A customer must **never** ambiguously transact against the wrong business. The URL segment is the source of truth; session `businessId` must match on every gateway invocation.

---

## Authentication Model

### Staff vs Customer authentication boundary

| Aspect | Staff authentication | Customer authentication |
|--------|---------------------|---------------------------|
| Purpose | Operate business | Buy from business |
| Entry | `/login` | Guest auto-session; `/store/[code]/account/login` |
| Session cookie | Platform auth session | Customer guest session + optional customer auth session |
| Post-login destination | `/home` (business selection) | Return to storefront cart/checkout |
| Business membership | **Required** | **Must not exist** for customer path |
| RBAC roles | ENG-002 role assignments | **Not used** |
| Authorization | Permission codes from membership | Customer Web Policy grants |

### Shared infrastructure

Both use the **same platform identity substrate** (ENG-002 auth service, platform user table) but **different authorization paths**:

- Staff: `platformUserId` → `businessMembershipId` → RBAC permissions
- Customer: `platformUserId` (optional) → `partyId` → Customer Web capability grants

A platform user may theoretically hold both a staff membership and a customer Party link, but **session context is mutually exclusive per request path** — Staff Web requests never use Customer Web context and vice versa.

### Guest sessions

| Property | Value |
|----------|-------|
| Cookie name | `customer-web-session` (proposed) |
| Contents | Signed `{ sessionId, businessId, businessCode, createdAt }` |
| HttpOnly | Yes |
| Scope | Path `/store/[businessCode]` |
| Duration | 24h sliding (configurable via ENG-003a) |
| Actor type | `ANONYMOUS` until Party linked |

---

## Customer Session / Context

### Minimum Customer Web context

```typescript
// Design contract — not yet implemented
type CustomerWebSessionContext = {
  sessionId: string;
  correlationId: string;
  channel: "WEB";
  actorType: "CUSTOMER" | "ANONYMOUS";
  authenticationState: "GUEST" | "AUTHENTICATED";
  tenantId: string;           // business.id
  tenantCode: string;         // business.code from URL
  partyId: string | null;
  platformUserId: string | null;
  cartContext: {
    draftOrderId: string | null;
    lineCount: number;
  } | null;
  startedAt: string;
};
```

### Context invariants

1. Customer context **never** inherits staff `CurrentBusinessContext` from the business-context cookie.
2. Customer context **never** carries staff `businessMembershipId` or staff permission codes.
3. `correlationId` propagates to domain audit on every mutating capability.
4. Cart/order context references BP-006 draft or submitted order IDs only — no duplicate order state in the channel layer.

### Mapping to ENG-003o types

| Customer Web field | ENG-003o `ChannelSession` / `ChannelIdentity` |
|--------------------|--------------------------------------------------|
| sessionId | `session.sessionId` |
| correlationId | `session.correlationId` |
| tenantId | `session.businessId` |
| partyId | `identity.partyId` |
| actorType | `identity.actorType` |
| channel | `identity.channel` = `WEB` |

---

## Customer Journey (MVP)

Simple SME commerce journey — **one vertical slice**, not an exhaustive journey catalogue.

```
Discover business          /store/[businessCode]
        ↓
Browse offering            /store/[businessCode]/catalogue
        ↓
View product               /store/[businessCode]/product/[offeringId]
        ↓
View price                 (inline / server action — PRICE_QUERY)
        ↓
Check availability         (inline — STOCK_AVAILABILITY_QUERY)
        ↓
Select quantity            (cart UI state)
        ↓
Review order               /store/[businessCode]/cart
        ↓
Create sale                (CREATE_SALE — guest or authenticated)
        ↓
Checkout / payment         /store/[businessCode]/checkout
        ↓
Initiate payment           (INITIATE_PAYMENT)
        ↓
Payment status             /store/[businessCode]/order/[orderId]/payment
        ↓
Order confirmation         /store/[businessCode]/order/[orderId]/confirmation
```

### Journey constraints

- Mobile-first: target ≤ 3 taps from catalogue to cart.
- No staff navigation chrome (no hub sidebar, no operational workspace zones).
- No quotation workflow in MVP (staff CRM journey — `CREATE_QUOTATION` excluded).
- Inventory is queried, never mutated, by Customer Web.

---

## Capability Allow-List (Customer Web)

Customer Web authorization uses an **explicit allow-list**. The flag `requiresStaffContext = false` in the capability registry is **necessary but not sufficient** for Customer Web exposure.

### MVP allow-list (6 capabilities)

| Capability ID | Access | Domain | MVP journey step |
|---------------|--------|--------|------------------|
| `OFFERING_VIEW` | READ | BP-003 | Browse catalogue / product detail |
| `PRICE_QUERY` | READ | BP-005 | Display customer-facing price |
| `STOCK_AVAILABILITY_QUERY` | READ | BP-008 | Show availability indicator |
| `CREATE_SALE` | WRITE | BP-006 | Submit order / create direct sale |
| `INITIATE_PAYMENT` | WRITE | BP-007 | Start payment for order obligation |
| `VIEW_ORDER` | READ | BP-006 | Order confirmation & status page |

**Payment status:** `VIEW_PAYMENT_STATUS` is included as a **sub-invocation** of the checkout/confirmation flow (same screen, not a separate journey). Counts toward policy but not as a separate UX step.

### Customer Web permission grants (new — not staff RBAC)

Customer capabilities require **Customer Web permission codes** distinct from staff ENG-002 permissions:

| Capability | Proposed customer permission | Guest allowed |
|------------|------------------------------|---------------|
| `OFFERING_VIEW` | `CustomerWeb.Offering.Read` | Yes |
| `PRICE_QUERY` | `CustomerWeb.Price.Read` | Yes |
| `STOCK_AVAILABILITY_QUERY` | `CustomerWeb.Stock.Read` | Yes |
| `CREATE_SALE` | `CustomerWeb.Order.Create` | Yes (with contact capture) |
| `INITIATE_PAYMENT` | `CustomerWeb.Payment.Create` | Yes |
| `VIEW_ORDER` | `CustomerWeb.Order.Read` | Scoped to session/party |
| `VIEW_PAYMENT_STATUS` | `CustomerWeb.Payment.Read` | Scoped to session/party |

Guest sessions receive a fixed **guest grant set** via Customer Web Policy. Authenticated customers receive the same grants plus persistent `partyId` scoping on read capabilities.

### Deny-list (explicit — staff-only)

The following must **remain prohibited** on Customer Web regardless of registry flags:

| Category | Capabilities / domains | Reason |
|----------|------------------------|--------|
| **Workspace shells** | `*_WORKSPACE` (all) | Staff operational UI entry points |
| **Procurement** | `VIEW_SUPPLIER`, `CREATE_PROCUREMENT_REQUEST`, `VIEW_PROCUREMENT_STATUS`, `PROCUREMENT_DASHBOARD`, `PROCUREMENT_WORKSPACE` | Supplier/operator domain |
| **Inventory mutation** | Adjustments, transfers, stocktake, receiving | Write paths bypass customer scope |
| **CRM administration** | `CREATE_QUOTATION`, campaign, case governance | Staff seller workflows |
| **Commercial governance** | `COMMERCIAL_GOVERNANCE_WORKSPACE`, tax compliance admin | Configuration / compliance |
| **Party administration** | `PARTY_WORKSPACE`, party CRUD | Master data management |
| **Payment operations** | Refund approval, settlement, exception resolution | Operator controls |
| **Sales operations** | Order approval, completion approval, amendments | Maker-checker staff workflows |
| **Business configuration** | Settings, roles, permissions | Tenant administration |

---

## Route Structure

### Recommended architecture

```
src/app/
├── (authenticated)/          ← STAFF WEB (unchanged)
│   └── (app)/
│       ├── sales/
│       ├── products/
│       ├── procurement/
│       └── ...
│
└── (public)/                 ← CUSTOMER WEB (new)
    └── store/
        └── [businessCode]/
            ├── page.tsx                    Home / storefront
            ├── catalogue/page.tsx          Browse
            ├── product/[offeringId]/page.tsx
            ├── cart/page.tsx
            ├── checkout/page.tsx
            ├── order/
            │   └── [orderId]/
            │       ├── confirmation/page.tsx
            │       └── payment/page.tsx
            └── account/                      Optional MVP+
                ├── login/page.tsx
                └── register/page.tsx
```

### Route justification

| Decision | Choice | Reason |
|----------|--------|--------|
| Route group | `(public)/store/…` | Aligns with existing `(public)` layout for unauthenticated pages (`/login`, supplier token portals) |
| Tenant key | `[businessCode]` | Uses existing unique `business.code`; no schema migration for MVP |
| Prefix `store` | Not `/sales`, `/products` | Clear separation from staff operational routes |
| Nested under business | All routes scoped | Tenant binding is structural, not optional query param |

### Middleware changes (future implementation)

Add `/store` to `PUBLIC_PATHS` in `middleware.ts`. Customer Web routes must **not** require staff auth session or staff business-context cookie.

---

## Web Presentation Adapter Boundary

Customer Web is a **new presentation adapter** under ENG-003o IP-08, distinct from the Staff Web adapter.

```
Customer Web UI (RSC pages)
        ↓
Customer Web Server Actions  ← presentation layer only
        ↓
Web Customer Channel Adapter  ← NEW (IP-08 slice)
        ↓
Channel Gateway Service
        ↓
Domain Service (existing BP contracts)
```

| Component | Staff Web (today) | Customer Web (target) |
|-----------|-------------------|------------------------|
| Adapter | `WebChannelAdapter` + `requireWebChannelContext` | `WebCustomerChannelAdapter` + `requireCustomerWebChannelContext` |
| Identity resolver | `resolveAuthenticatedStaffIdentity` | `resolveCustomerWebIdentity` (IP-03) |
| Policy evaluator | `evaluateChannelPolicy(WEB, …)` | `evaluateCustomerWebPolicy(…)` |
| Business context | Staff `CurrentBusinessContext` (membership) | `CustomerTenantContext` (tenant only) |

**No generic public API layer** is required for MVP. Next.js RSC / Server Actions remain the transport when cleanly behind the adapter + gateway boundary.

---

## Gateway Integration

### Request pipeline (Customer Web)

```
Customer Web Server Action
        ↓
Web Customer Channel Adapter.invoke(request, handler)
        ↓
Channel Gateway.execute()
        ├── 1. Resolve tenant from CustomerTenantContext (not staff cookie)
        ├── 2. Resolve identity (guest or customer — IP-03)
        ├── 3. Authentication check (capability-specific)
        ├── 4. evaluateCustomerWebPolicy(capability, identity)
        ├── 5. Build ChannelContext / correlationId
        └── 6. Execute domain handler
        ↓
ChannelResponse → presentation DTO
```

### Intent mapping (future conversational compatibility)

| Business intent | Capability | Domain command |
|-----------------|------------|----------------|
| `PRODUCT_PRICE_QUERY` | `PRICE_QUERY` | Commercial resolution |
| `STOCK_AVAILABILITY_QUERY` | `STOCK_AVAILABILITY_QUERY` | Inventory availability query |
| `CREATE_ORDER_REQUEST` | `CREATE_SALE` | Sales direct sale |
| `INITIATE_PAYMENT_REQUEST` | `INITIATE_PAYMENT` | Payment initiation |
| `VIEW_ORDER_STATUS` | `VIEW_ORDER` | Sales order get |

WhatsApp and other conversational channels will invoke the **same capabilities** through different adapters — not duplicate domain logic.

---

## Domain Contract Mapping

Customer Web consumes **existing domain services**. No customer-specific domain copies.

| Customer action | Capability | Gateway handler calls | Build Pack |
|-----------------|------------|----------------------|------------|
| Browse catalogue | `OFFERING_VIEW` | Product/offering catalogue read (customer-safe DTO) | BP-003 |
| View product detail | `OFFERING_VIEW` | Offering get by ID | BP-003 |
| Get price | `PRICE_QUERY` | Commercial resolution / pricing adapter | BP-005 (+ BP-003 price list) |
| Check stock | `STOCK_AVAILABILITY_QUERY` | `StockReservationService.listAvailability` (scoped) | BP-008 |
| Create order | `CREATE_SALE` | `SalesOrderService.createDirectSale` | BP-006 |
| View order | `VIEW_ORDER` | `SalesOrderService.get` (party/session scoped) | BP-006 |
| Initiate payment | `INITIATE_PAYMENT` | `PaymentInitiationService.initiate` | BP-007 |
| Payment status | `VIEW_PAYMENT_STATUS` | Payment transaction/obligation read | BP-007 |
| Party at checkout | (identity step) | Party create/match + `party_role` CUSTOMER | BP-002 |

### Presentation DTO requirement

Domain services currently return **workspace views** in some paths. Customer Web implementation must use **channel-safe command results** (see ENG-003o UI-shaped service contract debt) or thin customer DTO mappers in the adapter — **not** staff workspace components.

---

## Payment Flow

Customer Web uses existing BP-006 → BP-007 handoff. No Web-specific payment engine.

```
Customer Web: Checkout confirmed
        ↓
CREATE_SALE
        ↓
SalesOrderService.createDirectSale(context, { partyId, lines, … })
        ↓
Sales order created (BP-006)
        ↓
SalesOrderService.getPaymentReadyContract(context, orderId)
        ↓
Payment Obligation exists (BP-007 IP-01)
        ↓
INITIATE_PAYMENT
        ↓
PaymentInitiationService.initiate(context, { obligationId, method, amount, idempotencyKey })
        ↓
ENG-006 Payment Engine (existing provider/rail abstraction)
        ↓
VIEW_PAYMENT_STATUS / confirmation page
```

### Payment invariants (unchanged)

- BP-007 obligation model remains authoritative.
- Idempotency keys required on `INITIATE_PAYMENT` (existing `PAYMENT_IDEMPOTENCY_OPERATIONS`).
- Customer Web does not bypass allocation, receipt, or settlement rules.
- Refunds and exception resolution remain staff-only.

---

## Security / Authorization Model

### Complete request boundary

```
Customer Web HTTP Request
        ↓
Middleware (public path, no staff session required)
        ↓
Tenant Resolution (businessCode → businessId, inactive check)
        ↓
Guest / Customer Authentication
        ↓
Customer Identity Resolution (IP-03)
        ↓
Customer Web Policy (allow-list — NOT staff RBAC)
        ↓
Capability Authorization (permission grant + actor type check)
        ↓
Channel Gateway
        ↓
Domain Service (assertTenantScope, party scope on reads)
```

### Explicit prohibitions

| Anti-pattern | Prevention |
|--------------|------------|
| Customer Web → Staff RBAC | Separate policy evaluator; no `businessMembershipId` on customer path |
| Customer Web → Direct DB | Server actions call domain services only |
| Customer Web → Gateway bypass | All mutations through `WebCustomerChannelAdapter` |
| Cross-tenant access | `businessId` from URL must match domain context |
| Customer → Inventory mutation | Deny-list; availability query is read-only |
| Customer → Staff routes | Separate route tree; middleware isolation |

### Authorization gaps in current implementation (must fix before slice)

| Gap | Current state | Required fix |
|-----|---------------|--------------|
| G-01 | Gateway always calls `resolveAuthenticatedStaffIdentity` | Add `resolveCustomerWebIdentity` path (IP-03) |
| G-02 | `SALES_WORKSPACE`, `PAYMENT_WORKSPACE` marked non-staff in registry | Restrict workspace capabilities to `requiresStaffContext: true` |
| G-03 | Single WEB channel policy allows procurement on WEB | Split `evaluateCustomerWebPolicy` with deny-by-default |
| G-04 | Staff permission codes on customer-eligible caps (`SalesManagement.Order.Create`) | Introduce `CustomerWeb.*` permission grants |
| G-05 | No guest session mechanism | Implement signed customer-web-session cookie |
| G-06 | No tenant resolution from URL | `CustomerTenantResolver` from `businessCode` |
| G-07 | `OFFERING_VIEW` requires staff context in registry | Add customer-safe offering read capability config |
| G-08 | Order/payment read scoping not defined for guests | Scope by `partyId` or guest order token |
| G-09 | Idempotency on customer `CREATE_SALE` | Extend idempotency key to sales create path |
| G-10 | Customer-facing DTOs | Map workspace views to channel-safe responses |

---

## Audit / Correlation

| Event | Audit behaviour |
|-------|-----------------|
| All WRITE capabilities | `auditRequired: true` — propagate `correlationId` from Customer Web session |
| READ capabilities | Log correlation; optional audit per ENG-013 policy |
| Guest checkout | Audit records include `partyId` once resolved; guest `sessionId` before |
| Channel attribution | Audit metadata: `{ channel: "WEB", actorType, presentationProfile: "CUSTOMER_WEB" }` |

Existing ENG-013 domain audit helpers remain authoritative. Customer Web adds channel origin metadata — no duplicate audit engine.

---

## Idempotency

| Capability | Idempotency |
|------------|-------------|
| `CREATE_SALE` | Client/server idempotency key per checkout submission (extend BP-006 path) |
| `INITIATE_PAYMENT` | Existing BP-007 idempotency repository — **mandatory** |
| READ capabilities | Safe to retry; use correlation ID for tracing only |

Conversational channels (WhatsApp) will rely on the same idempotency keys for safe retries.

---

## UX Principles

1. **Mobile-first** — design for phone viewport first; progressive enhancement for desktop.
2. **Minimal navigation** — ≤ 7 top-level screens in MVP; no operational hub.
3. **Tenant-branded storefront** — business name/logo from tenant record; no InverBrass staff chrome.
4. **Clear commerce CTAs** — Add to cart, Checkout, Pay now, View order.
5. **Transparent pricing** — show resolved price before cart commitment.
6. **Stock honesty** — availability indicator before checkout; no oversell via Customer Web.
7. **Accessible guest path** — no forced account creation to complete purchase.
8. **Error recovery** — payment failure returns to checkout with preserved cart/order reference.

### Information architecture

```
Business Storefront
├── Home                    /store/[businessCode]
├── Catalogue               /store/[businessCode]/catalogue
├── Product                 /store/[businessCode]/product/[offeringId]
├── Cart                    /store/[businessCode]/cart
├── Checkout                /store/[businessCode]/checkout
├── Payment status          /store/[businessCode]/order/[orderId]/payment
└── Order confirmation      /store/[businessCode]/order/[orderId]/confirmation
```

This is **not** staff navigation. Do not reproduce the operational workspace.

---

## Future Conversational Channel Compatibility

The same capability allow-list and gateway pipeline supports future channels without domain rewrites:

```
Customer Web          ──┐
Customer App (PWA)    ──┤
WhatsApp              ──├──► ENG-003o Channel Gateway
Messenger / Instagram ──┤         │
API (when needed)     ──┘         ▼
                          Capability allow-list
                                  │
                                  ▼
                          BP-003 / BP-005 / BP-006 / BP-007 / BP-008
```

Conversational adapters (ENG-003o IP-07) add:
- External identity key → Party resolution (IP-03)
- Intent → capability mapping (IP-05)
- Session continuity (IP-04)

Domains remain unchanged.

---

## Design Decision Matrix

| Decision | Recommended approach | Reason |
|----------|---------------------|--------|
| **Customer actor** | `CUSTOMER` or `ANONYMOUS` with BP-002 Party linkage at checkout | Single party master; no parallel customer store |
| **Guest support** | **Yes — guest-first (Option B)** | SME conversion requires low-friction first purchase |
| **Customer authentication** | Optional customer account on shared platform identity; **no business membership** | Separates buyer from operator; avoids RBAC collision |
| **Tenant discovery** | `/store/[businessCode]` using existing `business.code` | Explicit, secure, no new slug schema for MVP |
| **Customer Web routes** | `(public)/store/[businessCode]/…` | Isolated from staff `(authenticated)/(app)/…` routes |
| **Customer session** | Signed guest cookie + optional customer auth; never staff business-context cookie | Prevents permission inheritance from staff session |
| **Capability allow-list** | 6 explicit capabilities with `CustomerWeb.*` permission grants | `requiresStaffContext=false` alone is insufficient |
| **Staff/customer separation** | Separate presentation adapter, policy, routes, and context | Same gateway infrastructure; different authorization path |
| **Payment initiation** | Existing BP-006 payment-ready contract → BP-007 `initiate` | BP-007 invariants remain authoritative |
| **Order tracking** | `VIEW_ORDER` scoped to `partyId` or guest order token | No access to staff sales workspace |
| **Future WhatsApp compatibility** | Same capabilities via conversational adapter + IP-03 identity | Domains unchanged; new adapter only |
| **Transport** | Next.js RSC / Server Actions behind adapter | No premature public REST API |
| **Registry fix** | Set all `*_WORKSPACE` to `requiresStaffContext: true` | Closes accidental customer exposure |

---

## Implementation Sequence (Frozen)

### Step 1 — Customer Web foundation

**ENG-003o: IP-03 Customer Identity Resolution + IP-08 Web Customer Presentation Adapter**

- `resolveCustomerWebIdentity()` — guest and authenticated paths
- `CustomerTenantResolver` — `businessCode` → `businessId`
- `WebCustomerChannelAdapter` + `requireCustomerWebChannelContext()`
- `(public)/store/[businessCode]/` route shell and layout
- Guest session cookie mechanism
- Middleware: public `/store` paths

### Step 2 — Customer Web capability policy

**ENG-003o: IP-02 Capability Registry / Channel Policy**

- `evaluateCustomerWebPolicy()` — deny-by-default
- `CustomerWeb.*` permission grant constants
- Fix registry: workspace capabilities → staff-only
- Customer-safe `OFFERING_VIEW` configuration
- Deny-list enforcement tests

### Step 3 — Vertical slice

Implement only:

```
Browse (OFFERING_VIEW)
  ↓
Price (PRICE_QUERY)
  ↓
Stock (STOCK_AVAILABILITY_QUERY)
  ↓
Create Sale (CREATE_SALE)
  ↓
Initiate Payment (INITIATE_PAYMENT)
  ↓
Order confirmation (VIEW_ORDER + VIEW_PAYMENT_STATUS)
```

Customer-facing DTO mappers; no staff workspace reuse.

### Step 4 — Customer IAM hardening

- Customer permission grants (not RBAC roles)
- Party create/match at checkout
- Order/payment read scoping (party + guest token)
- Idempotency on CREATE_SALE
- Optional customer account login/register

### Step 5 — Certification

**ENG-003o: IP-09**

Prove:

- [ ] Customer Web completes browse → pay → confirm journey
- [ ] Staff Web still works unchanged
- [ ] Customer cannot access staff capabilities
- [ ] Customer cannot cross tenants
- [ ] Domain services remain authoritative
- [ ] Payment and sales invariants intact
- [ ] Inventory not directly mutated by Customer Web
- [ ] Audit and correlation intact
- [ ] Idempotency intact on payment and sale create

---

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC-01 | Customer can open `/store/[businessCode]` without staff login |
| AC-02 | Customer can browse catalogue and view product detail |
| AC-03 | Customer sees resolved price for selected offering |
| AC-04 | Customer sees stock availability before adding to cart |
| AC-05 | Guest customer can complete checkout and create a sale |
| AC-06 | Customer can initiate payment against BP-007 obligation |
| AC-07 | Customer sees order confirmation and payment status |
| AC-08 | Staff routes (`/sales`, `/procurement`, etc.) reject customer session context |
| AC-09 | Customer Web rejects staff RBAC as authorization source |
| AC-10 | Request for business A cannot access business B data |
| AC-11 | No inventory mutation occurs via Customer Web |
| AC-12 | All WRITE operations carry correlationId in audit trail |
| AC-13 | Payment initiation is idempotent on retry |
| AC-14 | Party created/matched uses BP-002 — no duplicate customer master |
| AC-15 | Existing BP-009 supplier token portals continue to work |

---

## ENG-003o IP Mapping

| ENG-003o IP | Customer Web responsibility |
|-------------|----------------------------|
| **IP-01** | Channel Adapter Contract & Gateway — **this document** freezes Customer Web slice of adapter contract |
| **IP-02** | Capability Registry & Channel Policy — customer allow-list / deny-list |
| **IP-03** | Channel Identity Resolution — guest session, customer account, Party linkage |
| **IP-04** | Session / Context — `CustomerWebSessionContext`, cart/order anchors |
| **IP-05** | Intent → Capability — reuse intent codes for future WhatsApp |
| **IP-06** | Human Escalation — future (not MVP) |
| **IP-07** | Conversational Adapter — future WhatsApp/social |
| **IP-08** | Web Customer Presentation Adapter — routes, server actions, UI |
| **IP-09** | Certification — Customer Web regression + staff regression |

---

## Blocking Issues (Pre-Implementation)

These must be resolved in Steps 1–2 before UI vertical slice:

1. **No customer identity resolver** — gateway is staff-only today.
2. **Registry exposure risk** — workspace capabilities incorrectly allow non-staff actors.
3. **No Customer Web policy partition** — single WEB policy allows procurement.
4. **No customer permission model** — staff permission codes are wrong authorization primitive.
5. **No tenant-from-URL resolver** — staff business-context cookie is wrong tenant source.
6. **No guest session contract** — cannot maintain anonymous cart/order continuity.
7. **Customer-safe DTOs** — workspace views must not leak to storefront.

---

## References

- [15 – ENG-003o Channel & Experience Engine](../../01-enterprise-architecture/15-ENG-003o-Channel-Experience-Engine.md)
- [14 – Channel & Experience Layer Baseline Assessment](../../01-enterprise-architecture/14-Channel-Experience-Layer-Baseline-Assessment.md)
- [07-Channels — Channels & Experience Scope](../01-Channels%20%26%20Experience%20Scope.md)
- BP-002 Party · BP-003 Product · BP-005 Commercial · BP-006 Sales · BP-007 Payments · BP-008 Inventory
- `03-platform/src/core/channel-experience/` — existing ENG-003o implementation
- `03-platform/middleware.ts` — public path configuration

---

*Design gate complete. No production code changes authorized by this document. Implementation proceeds via ENG-003o Steps 1–5 above.*
