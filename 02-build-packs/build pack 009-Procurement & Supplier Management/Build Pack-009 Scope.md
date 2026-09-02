# BP-009 — Procurement & Supplier Management

## 1. Build Pack Definition

| Attribute | Definition |
|-----------|------------|
| Build Pack | BP-009 |
| Name | Procurement & Supplier Management |
| Priority | Critical |
| Status | ✅ Certified — IP-01 through IP-12 implemented; **359/359** smoke checks via `bp009-final-integration-certification.ts` |
| Architecture baseline | AV-1.12 (sourcing IP boundary + configurable tender opening) / AV-1.11 (Procurement hub IA) / AV-1.10 (ownership lock) / AV-1.9 inventory boundary / AV-1.7 Build Pack IDs |
| Primary Purpose | Provide end-to-end buy-side procurement without owning supplier identity, inventory on-hand, or GL |
| Primary Owner | Procurement / Operations |
| Depends On | BP-001 Business Setup, BP-002 Party & Relationship Management, BP-003 Product & Service Catalogue |
| Integrates With | BP-008 Inventory (receipt/on-hand), BP-007 Payments (customer AR — not reused), BP-010 Finance/GL (later), ENG-005 Workflow, ENG-013 Audit, ENG-009 Notification, ENG-015 Document |
| Core Principle | BP-009 owns the procurement transaction; BP-002 owns supplier identity; BP-008 owns inventory quantity; BP-010 owns GL |
| Tenant Model | Fully tenant/business isolated |
| Version | BP-009 v1 |
| Predecessor | BP-008 Inventory & Resource Management |
| Next | BP-010 Finance & Accounting Foundation |
| Related capabilities | SC-003 (supplier records via BP-002), SC-011 Purchasing & Supplier Deliveries |
| Primary engines | ENG-005 Workflow, ENG-013 Audit, ENG-009 Notification, ENG-015 Document, ENG-003c Organization, ENG-003b Localization & Regulatory, ENG-003e Integration, ENG-003n Work Assignment & SLA |

---

## 2. Purpose

BP-009 provides the platform's **end-to-end buy-side procurement capability**, enabling a business to identify purchasing needs, obtain supplier responses, evaluate suppliers, award business, issue and manage purchase orders, manage contracts, receive supplier deliverables, process supplier invoices, manage procurement exceptions, and continuously evaluate supplier performance.

The objective is that users can complete the procurement lifecycle **within the platform without relying on spreadsheets, email chains, or disconnected procurement systems**, except where an external integration is intentionally required.

The Build Pack must provide a complete, traceable relationship across:

```text
Need
 ↓
Purchase Request
 ↓
Approval
 ↓
RFX
 ↓
Supplier Response
 ↓
Evaluation
 ↓
Award
 ↓
Purchase Order
 ↓
Contract
 ↓
Receipt
 ↓
Supplier Invoice
 ↓
Matching / Exceptions
 ↓
AP / Payment Handoff
 ↓
Supplier Performance
 ↓
Future Procurement
```

Three-way matching between PO, receipt and supplier invoice is a key control and must be supported for applicable procurement types.

---

## 3. Business Objectives

BP-009 shall:

1. Digitise the end-to-end procurement lifecycle.
2. Reduce manual procurement activities and email-based supplier interactions.
3. Provide controlled and auditable purchasing.
4. Enable suppliers to participate directly in RFX and PO workflows.
5. Improve supplier competition and commercial outcomes.
6. Ensure procurement decisions are traceable from request to supplier performance.
7. Prevent unauthorised purchasing through configurable approval controls.
8. Reduce overpayment and procurement leakage through PO/receipt/invoice matching.
9. Create objective supplier performance records.
10. Use supplier performance to improve future sourcing decisions.
11. Support supplier blacklisting/suspension with documented reasons.
12. Provide a single procurement workspace for procurement users, business users and suppliers.

---

## 4. Business Problem

Without a controlled procurement capability:

* Purchase needs are captured in email and spreadsheets.
* Supplier identity is duplicated outside Party.
* RFQs and proposals cannot be compared on a common record.
* Awards cannot be traced to the winning response.
* Purchase orders are issued without approval evidence.
* Goods arrive without a procurement receipt instruction for BP-008.
* Supplier invoices are paid without matching to PO and receipt.
* Over-delivery, price variance and duplicate invoices are discovered after payment.
* Supplier performance is anecdotal rather than transactional.
* Blacklisted suppliers can still be used because status lives in a local list.

BP-009 provides a controlled procurement lifecycle while preserving existing ownership of Party, inventory and finance.

---

## 5. Scope Boundary

BP-009 owns the **procurement relationship and the procurement transaction**. It does **not** create a second supplier master.

```text
BP-002
Party
 └── Supplier Party
        │
        ├── Identity
        ├── Contact information
        ├── Organisation information
        └── Master data
                 ↓
             BP-009
       Procurement Relationship
        │
        ├── Qualification
        ├── Category / capability
        ├── Procurement status
        ├── Performance score
        ├── Preferred / approved status
        ├── Blacklisting status
        └── Procurement documents & history
```

BP-009 may maintain procurement-specific information. Supplier identity remains owned by BP-002.

---

## 6. In Scope

| Capability | Scope |
| ---------- | ----- |
| Supplier procurement relationship | Yes |
| Supplier registration workflow | Yes, using BP-002 Party |
| Supplier qualification | Yes |
| Supplier classification | Yes |
| Purchase Requests | Yes |
| Procurement approvals | Yes |
| RFIs | Yes |
| RFQs | Yes |
| RFPs | Yes |
| Other RFx | Yes |
| Supplier response portal/link | Yes |
| Bid/proposal evaluation | Yes |
| Supplier comparison | Yes |
| Award | Yes |
| Purchase Orders | Yes |
| PO supplier acceptance | Yes |
| PO amendments | Yes |
| Contracts | Yes |
| Delivery tracking | Yes |
| Goods receipt handoff | Yes |
| Asset receipt handoff | Yes |
| Service receipt/confirmation | Yes |
| Supplier invoices | Yes |
| 2-way/3-way matching | Yes, according to configured procurement type |
| Procurement exceptions | Yes |
| Supplier performance | Yes |
| Supplier scorecards | Yes |
| Supplier preference | Yes |
| Supplier suspension/blacklisting | Yes |
| Procurement analytics | Yes |
| Procurement audit trail | Yes |
| Supplier communications | Yes |
| AP/payment handoff | Yes |
| Actual outgoing payment rails | **Open v1 decision** |

---

## 7. Explicitly Out of Scope

BP-009 must **not** become:

```text
❌ Supplier master          → BP-002
❌ Inventory ledger         → BP-008
❌ Inventory on-hand        → BP-008
❌ Warehouse management     → BP-008 / later WMS
❌ MRP                      → later manufacturing
❌ Manufacturing            → later VS-011 / production
❌ Sales quotation          → BP-004 / BP-006
❌ Sales order              → BP-006
❌ Customer payment         → BP-007
❌ Customer AR              → BP-007
❌ GL / journals            → BP-010
❌ Customer CRM             → BP-004
❌ Bookings / appointments  → BP-004 / out of current packs
```

Cross-pack ownership:

| Interaction | Ownership |
| ----------- | --------- |
| Supplier identity | BP-002 |
| Supplier party | BP-002 |
| Procurement relationship | **BP-009** |
| Purchase Request | **BP-009** |
| RFX | **BP-009** |
| Supplier response | **BP-009** |
| Evaluation | **BP-009** |
| Award | **BP-009** |
| PO | **BP-009** |
| Contract | **BP-009** |
| Inventory receipt | BP-008 |
| Inventory / on-hand | BP-008 |
| Asset / depreciation | Asset / Finance capability (later; not BP-009 ledger) |
| Supplier invoice | **BP-009** |
| AP / payment handoff | **BP-009 → Finance** |
| GL | BP-010 |
| Supplier payment rail | **Open v1 decision** |
| Customer AR | BP-007 |

---

## 8. End-to-End Procurement Lifecycle

### Stage 1 — Need

A procurement need can originate from:

* manual user request
* approved business requirement
* contract requirement
* inventory / reorder signal from BP-008
* recurring procurement requirement
* project / program requirement

**BP-008 reorder is a signal. It does not create a PO.** The procurement process begins in BP-009.

### Stage 2 — Purchase Request

The user creates a Purchase Request including requester, business unit, required item/service, quantity, specification, required date, delivery location, justification, estimated value, suggested supplier where permitted, and supporting documents. The request then follows configurable approval rules.

### Stage 3 — RFX

Supported instruments: RFI, RFQ, RFP, other RFx. RFX is linked to the originating Purchase Request where one exists. Before publish, the buyer locks **evaluation configuration** (technical phases + financial weight/basis) and the system **resolves opening policy** (Organisation Default / Standard / Maker-Checker) from organisation default plus enforcement rules (RFX value, procurement category, type, risk). Maker-Checker is **not** universal. An RFX user cannot weaken a mandated Maker-Checker control. See IP-03 and AV-1.12.

### Stage 4 — Supplier response

Procurement invites suppliers via a secure link. Responses are stored with version integrity. Suppliers never see competitor bids. During bidding, buyer screens show submission status, not prices, until the RFX is **opened** under policy. Payment-term schedules belong on the financial proposal, not on evaluation weights. See IP-04.

### Stage 5 — Evaluation and award

After close and opening (Standard: authorised role + access log; Maker-Checker: dual control), evaluators apply the locked technical phases and financial method (Lowest Compliant Quote or Best Overall Score). Award is linked to the winning supplier response. Header commercial savings and header/split award already exist in code — enhance; do not rebuild. See IP-05.

### Stage 6 — Purchase Order

A PO may be generated from an approved award (or from an approved request where RFX is not required by policy). The supplier may Accept, Reject, or Request Change where permitted.

### Stage 7 — Contract

Contracts are linked to procurement activity. Lifecycle includes versioning, dates, value, scope, SLA, payment terms, documents, milestones, obligations, and expiry/renewal alerts.

### Stage 8 — Receiving

BP-009 owns the procurement transaction, not inventory on-hand.

```text
PO
 ├── Inventory  → Goods Receipt instruction → BP-008 IP-02
 ├── Asset      → Asset Receipt handoff → Asset Register / Finance
 └── Service    → Service Confirmation → Accepted Service
```

**BP-009 must not create its own inventory ledger.**

### Stage 9 — Supplier invoice and matching

Invoices are captured against the procurement transaction. Duplicate detection is required. Matching is configurable:

* Two-way: PO ↔ Invoice (typically services / no-receipt types)
* Three-way: PO ↔ Receipt ↔ Invoice (physical goods and applicable purchases)
* Four-way (future): PO → Receipt → Inspection → Invoice

### Stage 10 — Exceptions, AP handoff, performance

Exceptions have Issue → Owner → Action → Resolution → Approval → Audit. Approved matched invoices become payment-ready / AP handoff. Transactional performance feeds future sourcing. Preferred status must not automatically guarantee awards. Blacklisting prevents new procurement according to configurable policy; historical records remain accessible.

---

## 9. Procurement Approval

Approval must support configurable rules based on factors such as amount, category, business unit, requester, procurement type, risk, supplier, and contract status.

Example (illustrative only; actual thresholds are configuration-driven):

```text
≤ KES 50,000
    → Manager

KES 50,001–500,000
    → Manager → Procurement

> KES 500,000
    → Manager → Procurement → Executive
```

Approval must provide maker/checker where applicable, approval history, rejection reason, delegation where supported, escalation, and audit trail. Approvals consume ENG-005; BP-009 must not invent a second workflow engine.

---

## 10. Core Procurement Model

```text
Party (BP-002)
   │
   └── Procurement Profile (BP-009)
          │
          ├── Qualification
          ├── Category / capability
          ├── Status (Active / Preferred / Conditional /
          │           Suspended / Blacklisted / Inactive)
          └── Performance (accumulated from later IPs)
                 │
Purchase Request
   │
   ├── Approval
   └── RFX (RFI / RFQ / RFP / RFx)
          │
          ├── Invitation
          ├── Supplier Response
          ├── Evaluation
          └── Award
                 │
                 ├── Purchase Order
                 │      ├── Amendment
                 │      ├── Acceptance
                 │      ├── Receipt instruction (handoff)
                 │      └── Supplier Invoice
                 │             ├── Match
                 │             ├── Exception
                 │             └── AP / Payment Handoff
                 └── Contract
                        ├── Version
                        ├── Milestone / obligation
                        └── Expiry / renewal
```

Every procurement transaction must maintain a navigable lifecycle in either direction, for example:

```text
PR-0001 → RFX-0004 → Response-003 → Award-0002
        → PO-0015 → Contract-002 → Receipt-004
        → Invoice-006 → Match-006 → Payment Handoff
```

---

## 11. Key Invariants

These are non-negotiable architecture rules.

| ID | Invariant |
| -- | --------- |
| INV-001 | Supplier identity is owned by BP-002. BP-009 must not create a second supplier master. |
| INV-002 | Inventory on-hand and the stock ledger are owned by BP-008. BP-009 must not create an inventory ledger. |
| INV-003 | GL / journals are owned by BP-010. BP-009 produces AP/payment handoff, not postings. |
| INV-004 | Customer AR, receipts and customer payment rails remain BP-007. |
| INV-005 | BP-008 reorder is a signal only. It must not create a PO. |
| INV-006 | Award must be linked to the winning supplier response where RFX was used. |
| INV-007 | Three-way matching is required for procurement types configured to require receipt. |
| INV-008 | Duplicate supplier invoices must be detected before match/approval. |
| INV-009 | Preferred supplier status must not automatically guarantee an award. |
| INV-010 | Blacklisted suppliers must be blocked from new procurement according to configurable policy. Historical records remain accessible. |
| INV-011 | All procurement data is scoped to authenticated `businessId`. Cross-business access fails closed. |
| INV-012 | Procurement lifecycle events are audited through ENG-013. |
| INV-013 | Approvals consume ENG-005. No pack-local workflow engine. |
| INV-014 | Documents consume ENG-015. No pack-local document engine. |
| INV-015 | The same procurement instruction must not create duplicate POs, receipts, invoices or matches (idempotency). |
| INV-016 | Outgoing payment rails remain an explicit v1 decision. IP-09 may produce payment-ready / AP handoff without owning rails or GL. |

---

## 12. Architecture

BP-009 should follow the same architecture pattern established in BP-007 and BP-008.

```text
src/core/
   procurement-engine/
       ports
       types
       policies
       adapters

src/modules/procurement/
       services
       repositories
       rules
       actions
       components
```

**Core engine** owns reusable procurement mechanics: identifiers, status transitions, matching policies, approval consumption, handoff contracts.

**Domain module** owns: procurement screens, RFX, PO, contract, invoice, exception and supplier-performance workspaces.

Do not place procurement entities inside Party, Inventory, Payments or CRM modules.

---

## 13. Integration Architecture

```text
BP-002 Party (supplier identity)
       │
       ▼
    BP-009
Procurement & Supplier Management
       │
       ├── Purchase Request / RFX / Award / PO / Contract / Invoice
       ├── Receipt instruction ──────► BP-008 (inventory quantity)
       ├── Asset receipt instruction ► Asset / Finance capability
       ├── Service confirmation      ► accepted service record
       └── AP / payment-ready ──────► BP-010 / payment-rail decision
              │
              ▼
         ENG-013 Audit
         ENG-005 Workflow
         ENG-015 Document
```

Need origins:

```text
Manual request
Approved requirement
Contract requirement
BP-008 reorder signal ──► BP-009 Purchase Request (not a PO)
Recurring requirement
Project / program requirement
```

---

## 14. Proposed IP Structure

Twelve IPs. Do not create an IP for every individual screen.

| IP | Name | Primary Responsibility | Status |
| -- | ---- | ---------------------- | ------ |
| **IP-01** | Procurement Foundation & Supplier Relationship | Procurement domain foundation, supplier procurement profile, statuses, qualification | 🔧 Implemented (enhance provenance later) |
| **IP-02** | Purchase Requests & Procurement Approval | Request creation, routing, approval, rejection | 🔧 Implemented |
| **IP-03** | RFX Management | RFI/RFQ/RFP/RFx creation, criteria lock, opening policy | 🔧 Partial (create/invite in code; policy/close specified) |
| **IP-04** | Supplier Response & Collaboration | Secure links, versioned responses, payment-term proposal, clarifications | 🔧 Partial (header portal/quotes in sourcing; do not rebuild) |
| **IP-05** | Evaluation, Award & Sourcing Decision | Opening, technical/financial evaluation, recommendation, award | 🔧 Partial (commercial header award in sourcing; do not rebuild) |
| **IP-06** | Purchase Order Management | PO generation, approval, issue, acceptance, amendments, closure | 📋 Specified |
| **IP-07** | Contract Management | Contracts, versions, obligations, milestones, expiry/renewal | 📋 Specified |
| **IP-08** | Procurement Receiving & Fulfilment Handoff | Inventory/asset/service receipt orchestration and BP-008 handoff | 📋 Specified |
| **IP-09** | Supplier Invoice & Matching | Invoice capture, duplicate detection, 2/3-way matching | 📋 Specified |
| **IP-10** | Procurement Exceptions & Controls | Variances, disputes, rejected deliveries, invoice/PO exceptions | 📋 Specified |
| **IP-11** | Supplier Performance & Governance | Scorecards, preferred suppliers, suspension/blacklisting | 📋 Specified |
| **IP-12** | Procurement Analytics & Lifecycle Intelligence | Spend, sourcing, supplier, PO and procurement analytics | 📋 Specified |

### Dependency flow

```text
IP-01
  ↓
IP-02
  ↓
IP-03
  ↓
IP-04
  ↓
IP-05
  ↓
IP-06
  ↓
IP-07
  ↓
IP-08
  ↓
IP-09
  ↓
IP-10
  ↓
IP-11
  ↓
IP-12
```

This is **not a rigid sequential workflow**. Contracts can exist before or alongside POs. Supplier performance continuously feeds future sourcing. Direct-award / catalogue purchase policies may skip RFX where configured.

---

## 15. Open v1 Decision — Supplier Payment Rails

**Supplier payment rails / outgoing AP payments remain an explicit v1 decision.**

The procurement system must be capable of taking an approved invoice through:

```text
Invoice
 ↓
Match
 ↓
Approval
 ↓
Payment-ready / AP handoff
```

without prematurely making BP-009 the owner of payment rails or GL.

This preserves the BP-007 (customer AR) and BP-010 (GL) boundaries while still delivering the end-to-end procurement user experience.

Do not implement outgoing payment execution, bank/mobile-money disbursement, or journal posting in BP-009 v1 unless this decision is explicitly closed.

---

## 16. BP-009 v1 Definition of Done

BP-009 should be considered complete when the system can reliably answer:

What do I need to buy, who approved it, which suppliers were invited, what did they offer, who was awarded, what PO was issued, what was received, what invoice was matched, what exception remains, what is payment-ready, and how has this supplier performed?

And technically:

- [ ] Supplier procurement profile on BP-002 Party (no second master)
- [ ] Qualification, category and procurement status
- [ ] Purchase requests with configurable approval
- [ ] RFX lifecycle (RFI/RFQ/RFP/RFx) with locked evaluation configuration and configurable opening policy
- [ ] Secure supplier response (sealed storage; version integrity)
- [ ] Evaluation, comparison and award (after opening)
- [ ] Purchase orders with acceptance and amendments
- [ ] Contracts with versioning and expiry/renewal alerts
- [ ] Inventory / asset / service receipt handoff (no inventory ledger)
- [ ] Supplier invoices with duplicate detection
- [ ] Configurable 2-way / 3-way matching
- [ ] Procurement exceptions with audit
- [ ] Supplier scorecards, preference and blacklisting
- [ ] Procurement analytics
- [ ] Procurement business hub with nested capabilities (NAV-001–NAV-020; see Navigation Hub)
- [ ] Full lifecycle navigation in both directions
- [ ] Tenant isolation
- [ ] Idempotency
- [ ] ENG-013 audit
- [ ] ENG-005 approvals
- [ ] No supplier master, inventory engine, payment rail, GL, CRM, or sales-order engine
- [ ] Pack-level end-to-end certification

---

## 17. Locked architectural principles

Do not let BP-009 calculate commercial sales truth, inventory quantity truth, or GL truth.

* BP-002 says: "This party is the supplier."
* BP-003 says: "This is the item/service being bought."
* BP-008 says: "These units entered inventory."
* BP-009 says: "This is the buy-side transaction from need through match and supplier performance."
* BP-010 eventually says: "The financial/accounting consequence is X."
* Outgoing payment rails: open v1 decision.
* **AV-1.12:** One sourcing implementation. IP-03/04/05 are certification boundaries, not duplicate engines. Tender opening is configurable (Standard vs Maker-Checker); always-on RBAC, audit, bid lock, version integrity, and access logging apply to both. Enforcement rules may mandate Maker-Checker; users cannot weaken a mandate.

---

## 18. Navigation Hub (AV-1.11)

Canonical IA: [BP-009 Navigation Hub](./BP-009%20Navigation%20Hub.md).

* **Procurement** is a primary business hub (after Inventory, before Settings).
* **Suppliers** lives under Procurement. It is not a top-level hub.
* Runtime now exposes `Procurement → Suppliers`, `Purchase Requests`, and `Sourcing` (RFX / Evaluations / Awards as views of the same events). Purchasing, Contracts, Receiving, Invoices, Performance, and Analytics are added when those IPs exist.
* Navigation uses the existing platform shell. No second framework. Mobile: **More → Procurement**, not the bottom bar.
* Operational UI never shows BP-009, IP-*, or PROC-* labels.

---

**Next step:** Do not implement IP-04 or IP-05 as new engines. After this documentation lock (AV-1.12), the next **code** increment requires explicit approval: sealed/opening policy, then evaluation-criteria lock, then IP-04 commercial depth, then IP-05 scoring — in that order. IP-06 waits on award-line handoff.
