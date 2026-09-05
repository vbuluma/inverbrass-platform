# 15 – ENG-003o Channel & Experience Engine

## Document Information

| Attribute | Value |
|-----------|-------|
| Document Name | ENG-003o — Channel & Experience Engine |
| Version | 1.0 |
| Architecture Version | AV-1.13 |
| Status | **Scope frozen** — Web reference implementation (IP-01–03) |
| Implementation | `03-platform/src/core/channel-experience/` |

---

## Purpose

ENG-003o is the **Channel & Experience Engine** — the platform boundary through which users access business capabilities across Web, App, Staff, API, and future conversational channels.

> **InverBrass is the business operating platform. Web, App, Staff, and Conversational interfaces are channels through which users access business capabilities. Channels do not own business logic.**

---

## Target Architecture

```
WEB · APP · STAFF · CONVERSATIONAL · API
              │
              ▼
    CHANNEL & EXPERIENCE ENGINE (ENG-003o)
    Adapters · Gateway · Registry · Policy · Identity · Session · Intent
              │
              ▼
    DOMAIN CAPABILITIES / CONTRACTS
    CRM · Product · Sales · Payments · Inventory · Procurement · …
              │
              ▼
    CORE ENGINES (ENG-001 – ENG-016, ENG-003a–n, …)
```

---

## Responsibilities

| Area | Owner | Notes |
|------|-------|-------|
| Channel adapters | ENG-003o | Web is first concrete adapter |
| Gateway orchestration | ENG-003o | No domain business rules |
| Capability registry | ENG-003o | Meaningful business actions only |
| Channel policy | ENG-003o | Separate from domain logic |
| Identity resolution | ENG-003o | Maps to BP-002 Party / ENG-002 staff |
| Session / correlation | ENG-003o | Foundation only — no LLM |
| Intent mapping | ENG-003o | Contract only in v1 Web phase |
| Business state | Domain BPs | Single system of record |
| RBAC permissions | ENG-002 | Resolved at gateway boundary |
| Audit / idempotency | ENG-013 + domains | Preserved through gateway |

---

## Component Architecture

| Component | Location | Status |
|-----------|----------|--------|
| Constants & types | `core/channel-experience/constants.ts`, `types.ts` | Implemented |
| Capability registry | `core/channel-experience/capability-registry.ts` | Implemented (baseline set) |
| Channel policy | `core/channel-experience/channel-policy.ts` | Implemented (Web/Staff/App) |
| Channel Gateway | `core/channel-experience/services/channel-gateway-service.ts` | Implemented |
| Web adapter | `core/channel-experience/adapters/web-channel-adapter.ts` | Implemented |
| Identity resolver | `core/channel-experience/identity/channel-identity-resolver.ts` | Implemented (Web staff) |
| **Customer Web foundation (SL-ENG-003o-002)** | `core/channel-experience/customer/` | **CERTIFIED** (foundation) |
| Customer Web adapter | `customer/adapter.ts` | Implemented |
| Customer Web policy | `customer/policy.ts` | Implemented (deny-by-default allow-list) |
| Guest session | `customer/guest-session.ts` | Implemented (HMAC HttpOnly, path `/store`) |
| Tenant-from-URL | `customer/tenant-resolution.ts` | Implemented (`/store/[businessCode]`) |
| Session context | `core/channel-experience/session/channel-session-context.ts` | Implemented |
| Intent model | `core/channel-experience/intent/intent-model.ts` | Contract only |
| Permission resolution | `core/auth/services/permission-resolution-service.ts` | Implemented (ENG-002 staff) |

---

## Contracts

### Channel codes

`WEB`, `APP`, `STAFF`, `CONVERSATIONAL`, `WHATSAPP`, `MESSENGER`, `INSTAGRAM`, `API`

### Core types

- `ChannelIdentity` — channel, actor type, platform user, party, external key, roles, permissions
- `ChannelSession` — session ID, correlation ID, tenant, actor, channel
- `ChannelContext` — session + identity + business context
- `ChannelRequest` / `ChannelResponse` — adapter I/O envelope
- `ChannelExecutionContext` — passed to domain handlers after gateway checks
- `ChannelCapabilityDefinition` — registry entry
- `BusinessIntentCode` → `capabilityId` — intent mapping (no LLM)

### Gateway pipeline

```
Incoming Channel Request
        ↓
Tenant Resolution (CurrentBusinessContext)
        ↓
Identity Resolution (ChannelIdentity)
        ↓
Authentication
        ↓
Authorization / Channel Policy
        ↓
Capability Resolution
        ↓
Domain Contract (handler)
        ↓
Channel Response
```

---

## Capability Model

Capabilities represent **meaningful business actions/queries** — not every database function.

Each capability identifies:

- Owning domain (BP-003 – BP-009)
- Required permission (ENG-002 code)
- Allowed channels
- Authentication requirements
- Staff/customer context requirements
- Read/write mode
- Audit requirements

Initial registry includes: `OFFERING_VIEW`, `PRICE_QUERY`, `STOCK_AVAILABILITY_QUERY`, `CREATE_QUOTATION`, `CREATE_SALE`, `VIEW_ORDER`, `INITIATE_PAYMENT`, `VIEW_PAYMENT_STATUS`, `VIEW_SUPPLIER`, `CREATE_PROCUREMENT_REQUEST`, `VIEW_PROCUREMENT_STATUS`, `PROCUREMENT_DASHBOARD`, `PROCUREMENT_WORKSPACE`.

---

## Channel Policy

Channel access is controlled **separately from domain logic**:

| Channel | v1 status |
|---------|-----------|
| WEB | Enabled — reference implementation |
| STAFF | Enabled — same capability surface as Web |
| APP | Enabled — policy configured |
| API | Partial — selected capabilities |
| CONVERSATIONAL | Not enabled |
| WHATSAPP / MESSENGER / INSTAGRAM | Not enabled |

WhatsApp and social channels are enabled later through **policy + adapter** — not by changing Sales, Inventory, Payments, or Procurement domains.

---

## Identity Model

```
Channel Identity
       ↓
Party / Customer / Staff (platform user)
       ↓
Tenant (business)
       ↓
Roles / Permissions (ENG-002)
```

Web uses existing authenticated session and `CurrentBusinessContext` for **staff**.

**Customer Web (SL-ENG-003o-002)** uses a separate presentation profile:

```
/store/[businessCode]
        ↓
Tenant resolution (business.code → ACTIVE business) — never staff business-context cookie
        ↓
Guest session (HttpOnly) OR optional authenticated platform user
        ↓
CustomerChannelIdentity (CustomerWeb.* grants) — never staff RBAC
        ↓
evaluateCustomerWebPolicy (deny-by-default allow-list)
        ↓
Customer Channel Gateway → domain capability (future SL-CUS-001 handlers)
```

Party binding for authenticated customers is a **contract** in this slice; full platformUser→Party mapping within tenant remains for SL-CUS-001 / IAM (`PENDING_IAM`).

Cart is **session/channel state only** (D-03) — not a Sales domain entity.

CREATE_SALE **idempotency key contract** is ready at the channel boundary; BP-006 `createDirectSale` domain acceptance remains **BLOCKED** for SL-CUS-001.

Certification evidence: `03-platform/scripts/eng003o-customer-web-foundation-smoke.ts`

---

## Security & RBAC Fix (BP-009)

**Baseline gap:** Procurement server actions assigned `ALL_PROCUREMENT_PERMISSIONS`, bypassing ENG-002.

**Fix:** `PermissionResolutionService` resolves permissions from role assignments. Procurement entry points use `requireProcurementChannelContext()` which routes through the Web channel gateway and passes **resolved** permissions to domain services. Service-layer `assertPermission` remains authoritative for maker/checker.

`ALL_PROCUREMENT_PERMISSIONS` is retained for smoke/certification scripts only.

---

## Web Reference Implementation

All BP-002–BP-009 domain server actions route through ENG-003o channel entry helpers:

| Domain | Helper | Workspace Capability |
|--------|--------|---------------------|
| BP-002 Party | `requirePartyChannelContext` | `PARTY_WORKSPACE` |
| BP-003 Product | `requireProductChannelContext` | `PRODUCT_WORKSPACE` |
| BP-004 CRM | `requireCrmChannelContext` | `CRM_WORKSPACE` |
| BP-005 Commercial | `requireCommercialChannelContext` | `COMMERCIAL_WORKSPACE` |
| BP-005 Governance | `requireCommercialGovernanceChannelContext` | `COMMERCIAL_GOVERNANCE_WORKSPACE` |
| BP-005 Tax Compliance | `requireTaxComplianceChannelContext` | `TAX_COMPLIANCE_WORKSPACE` |
| BP-006 Sales | `requireSalesChannelContext` | `SALES_WORKSPACE` |
| BP-007 Payments | `requirePaymentChannelContext` | `PAYMENT_WORKSPACE` |
| BP-008 Inventory | `requireInventoryChannelContext` | `INVENTORY_WORKSPACE` |
| BP-009 Procurement | `requireProcurementChannelContext` | `PROCUREMENT_WORKSPACE` |

```
Web UI / Server Action
   ↓
require*ChannelContext()  (domain-channel-entry)
   ↓
Web Channel Adapter → Channel Gateway
   ↓
Domain Service (BP-002 – BP-009)
```

BP-001 onboarding/setup actions remain platform auth entry points and are not channel-domain operations.

---

## UI-Shaped Service Contracts (Technical Debt)

| Classification | Examples |
|----------------|----------|
| Already channel-neutral | Domain services using `CurrentBusinessContext` |
| Minor cleanup needed | Some workspace views (e.g. `EvaluationWorkspaceView`) |
| Future refactor | Split command results from presentation views |
| Acceptable as-is | Internal staff workspace DTOs not yet exposed externally |

No broad rewrites performed in this phase.

---

## IP Boundaries (Frozen)

| IP | Scope |
|----|-------|
| **IP-01** | Channel Adapter Contract & Gateway |
| **IP-02** | Capability Registry & Channel Policy |
| **IP-03** | Channel Identity Resolution |
| **IP-04** | Session / Context / Cross-Channel Context |
| **IP-05** | Intent → Capability → Domain Orchestration |
| **IP-06** | Human Escalation & Channel Handoff |
| **IP-07** | Conversational Channel Adapter — future WhatsApp/social |
| **IP-08** | Web/App/Staff Presentation Adapters |
| **IP-09** | Certification, Channel Contract Tests & Regression |

---

## Baseline → Target Matrix

| Area | Baseline | Change | Status |
|------|----------|--------|--------|
| Channel boundary | Not present | ENG-003o contracts + Web adapter | **Implemented (BP-002–009)** |
| Gateway | Server Actions only | Channel Gateway service | **Implemented** |
| Capability registry | Not present | Baseline + domain workspaces | **Implemented** |
| Channel policy | Not present | Web/Staff/App policy | **Implemented** |
| Identity | Auth session only | ChannelIdentity + permission resolution | **Implemented** |
| Session/context | Cookies only | ChannelSession + correlation ID | **Foundation** |
| Intent model | Not present | Contract only (no LLM) | **Defined** |
| RBAC | Procurement/commercial bypass | Real permissions from ENG-002 | **Fixed** |
| Web adapter | Implicit | All domain server actions | **Reference impl** |
| Customer Web boundary | Not present | Adapter + policy + guest session + tenant-from-URL | **CERTIFIED (SL-ENG-003o-002)** |
| WhatsApp | N/A | Future adapter hook only | **Future** |
| Audit | Domain helpers | Preserved via gateway context | **Unchanged** |
| Idempotency | Domain paths | Preserved — no channel duplicate engine | **Unchanged** |

---

## Explicit Non-Scope (This Phase)

- WhatsApp / Meta API / webhooks / templates
- Messenger / Instagram integration
- LLM / chatbot
- Production conversational messaging
- HTTP public API layer (gateway is in-process; HTTP is future IP)

---

## References

- [14 – Channel & Experience Layer Baseline Assessment](./14-Channel-Experience-Layer-Baseline-Assessment.md)
- [02 – Platform Module Catalog](./02-Platform-Module-Catalog.md) §3 — ENG-003o
- [01 – Enterprise Solution Architecture](./01-Enterprise-Solution-Architecture.md) §5 — ENG-003o
- `03-platform/src/core/channel-experience/`
- `03-platform/scripts/eng003o-channel-smoke-validation.ts`
- `03-platform/scripts/eng003o-customer-web-foundation-smoke.ts`
- `03-platform/src/app/(public)/store/[businessCode]/`
