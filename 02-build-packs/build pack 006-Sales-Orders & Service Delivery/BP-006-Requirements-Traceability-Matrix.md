# BP-006 — Requirements → IP → Runtime Traceability Matrix

| Attribute | Value |
|-----------|-------|
| **Subject pack** | **BP-006** – Sales, Orders & Service Delivery |
| Purpose | Keep creation, fulfilment, inspection, handoff and certification aligned; prevent Sales from becoming a second pricing, payment, inventory, quotation or booking engine |
| Status | Issued with pack documentation (2026-08-24) |
| Code | IP-01–IP-06 implemented in `03-platform` (2026-08-24) |

---

## Read this first

Every row below is **BP-006 work** unless the cell explicitly names another pack as owner.  
BP-005 appears as **Consumes** (commercial contract). BP-004 appears as **Consumes** (eligible quotation). BP-007/BP-008 appear as **Downstream consumers**.

---

## Locked IP IDs

| IP | Name |
|----|------|
| IP-01 | Sales & Order Creation |
| IP-02 | Order Lifecycle & Fulfilment |
| IP-03 | Delivery, Inspection & Service Completion |
| IP-04 | Amendments, Cancellation & Returns |
| IP-05 | Downstream Handoff & Sales Workspace |
| IP-06 | Sales Certification |

Do not split IP-01 because it contains many requirements.

---

## Core runtime path (end-to-end)

| Step | Requirement (plain language) | IP | Owner | Consumes | Produces | Downstream | Runtime test |
|------|------------------------------|----|-------|----------|----------|------------|--------------|
| 1 | Direct sale from existing customer + offering(s) | IP-01 | BP-006 | BP-002, BP-003 | Draft order + lines | IP-02 | RT-01 |
| 2 | Consume validated BP-005 commercial contract (no recalculation) | IP-01 | BP-006 | BP-005 IP-10 | Snapshot id, expected amount, provenance on order | IP-05, BP-007 | RT-02 |
| 3 | Convert eligible BP-004 quotation to sales order | IP-01 | BP-006 | BP-004 IP-10 | Order linked to quotation; CRM does not persist order | BP-004 (status), IP-02 | RT-03 |
| 4 | Confirm order (SoD when configured); fail closed on bad contract | IP-01 | BP-006 | ENG-005, BP-005 integrity | Confirmed order | IP-02 | RT-04 |
| 5 | Lifecycle status rolled up from delivery outcomes | IP-02 | BP-006 | IP-01, IP-03 | In progress / partial / complete gates | IP-05 | RT-05, RT-08 |
| 6 | Physical delivery + inspection: accept/reject full or partial; missing ≠ rejected; SoD | IP-03 | BP-006 | ENG-005, ENG-015 | Delivered/accepted/rejected/outstanding | IP-02, IP-04, IP-05, BP-008 | RT-06 |
| 7 | Service delivery/completion without inventory | IP-03 | BP-006 | Service lines | Delivery status + evidence | IP-02 completion gate | RT-07 |
| 8 | Header completion gated on IP-03 delivery, inspection and service | IP-02 | BP-006 | IP-03 | Completed or still outstanding | IP-05 | RT-08 |
| 9 | After rejection: amend / cancel / return / replace / correct | IP-04 | BP-006 | IP-03 rejected qty, BP-005 (if material), ENG-005 | Instruction; no refund/stock exec | BP-007, BP-008 | RT-09 |
| 10 | Payment-ready and fulfilment-ready contracts | IP-05 | BP-006 | Order + inspection | Amount due; qty to fulfil | BP-007, BP-008 | RT-10 |
| 11 | Sales workspace journeys without BP/IP jargon | IP-05 | BP-006 | IP-01–IP-04 | Sell / Convert Quote / Fulfil / Inspect | Users | RT-11 |
| 12 | Certification of BP-001→BP-006 continuity | IP-06 | BP-006 | All above | Certification record | Gate for BP-007 | RT-12 |

---

## BR → IP

| BR | Theme | Primary IP | Supporting |
|----|-------|------------|------------|
| BR-001, BR-002, BR-014 | Create sale for customer with offering lines | IP-01 | IP-05 |
| BR-003, BR-004 | Consume commercial contract; provenance | IP-01 | IP-05 |
| BR-021 | Quote-to-order conversion | IP-01 | IP-05, BP-004 |
| BR-005, BR-007, BR-008, BR-009, BR-010 | Lifecycle, status, partial fulfil | IP-02 | IP-03, IP-05 |
| BR-022, BR-023 | Delivery inspection + maker-checker | IP-03 | IP-01, IP-02 |
| BR-006, BR-011 | Service delivery | IP-03 | IP-02 |
| BR-012, BR-013 | Audit; tenant isolation | All | ENG-013 |
| BR-015, BR-016 | Downstream contracts | IP-05 | IP-01, IP-02 |
| BR-017, BR-018 | Amend / cancel; no silent commercial change | IP-04 | BP-005 |
| BR-019, BR-020 | Notes; next actions | IP-05 | IP-02, IP-03 |

---

## Pack FR → IP

| FR range | Theme | Primary IP |
|----------|-------|------------|
| FR-001–FR-010 | Create, lines, contract, draft, confirm | IP-01 |
| FR-046–FR-048 | Quote conversion | IP-01 |
| FR-011–FR-020 | Lifecycle | IP-02 |
| FR-021–FR-025 | Fulfilment status roll-up | IP-02 |
| FR-026–FR-030, FR-049–FR-060 | Delivery, inspection, accept/reject, evidence | IP-03 |
| FR-028, FR-032–FR-038 | Service delivery | IP-03 |
| FR-039–FR-045 | Amend / cancel / return / replace | IP-04 |
| FR-031 | Fulfilment contract | IP-05 |
| UX-001–UX-021 | Workspace | IP-05 |

---

## Explicit non-ownership (anti-regression)

| Capability | BP-006 owns? | Actually owned by | Guard test |
|------------|--------------|-------------------|------------|
| Commercial calculation | **No** | BP-005 | RT-02 |
| Quotation create/accept/version | **No** | BP-004 IP-10 | RT-03 |
| Quote → order execution | **Yes** | BP-006 IP-01 | RT-03 |
| Payment split / collected amount | **No** | BP-007 | RT-10 |
| Stock on-hand / movement | **No** | BP-008 | RT-06, RT-10 |
| Bookings / appointments / resource scheduling | **No** | Later / BP-004 calendar | RT-07, RT-12 |
| Goods inspection / acceptance | **Yes** | BP-006 IP-03 | RT-06 |

---

## Runtime test briefs (minimum)

| ID | Given | When | Then |
|----|-------|------|------|
| RT-01 | Same-business customer and offering | Create direct draft sale | Draft order with lines; unique order number in business |
| RT-02 | Valid BP-005 contract payable 1,230 | Confirm | Order stores 1,230 + snapshot id; no local tax/discount engine; `pricing_item` not used to invent price |
| RT-03 | Accepted unexpired quotation | Convert Quote | BP-006 order linked to quotation; CRM has no sales-order persistence; expired quote fails closed |
| RT-04 | Invalid/expired/tampered contract; SoD on | Confirm | Confirm blocked; maker cannot self-approve when SoD required |
| RT-05 | Confirmed qty 5 | IP-03 delivers 3 then attempts delivered total 6 | First delivery ok (outstanding 2); second fails (would exceed ordered); IP-02 shows partial |
| RT-06 | Physical line, 100 ordered, inspection + SoD on | Deliver/inspect: 80 accept, 15 reject (reason), 5 missing; maker tries to inspect own delivery | Delivered 95; missing 5; **outstanding 20**; missing not classified as rejected; reason stored; self-inspect fails; stock unchanged |
| RT-07 | Service line | Complete service | No inventory API; header still incomplete until IP-02 gates pass |
| RT-08 | Outstanding > 0 (missing or open rejected) or inspection/service pending | Complete order | Fail closed |
| RT-09 | Confirmed order; 80/15/5 split | Edit payable in place; amendment; return+replace vs return+credit | In-place edit fails; version needs new contract; return+replace outstanding 20; return+credit outstanding 5; no refund executed |
| RT-10 | Confirmed order amount due 300 | Read payment-ready and fulfilment-ready contracts | Amount due 300, no tender split; quantities present, no stock balance |
| RT-11 | Staff user | Sell / Convert Quote / Fulfil / Inspect | Journeys usable without BP/IP labels; next action obvious |
| RT-12 | Other-business ids | Read/write order | Fail closed; certification record complete; no BP-007 feature required |

---

## Wave exit criteria

| Wave | IPs | Must pass |
|------|-----|-----------|
| 1 — Core sale | IP-01 | RT-01, RT-02, RT-03, RT-04 — covered by `bp006-ip01-sales-order-creation-smoke-validation.ts` TC-01…TC-18 |
| 2 — Fulfilment status | IP-02 | RT-05 (quantity/partial roll-up) and RT-08 (completion gates) — covered by `bp006-ip02-order-lifecycle-fulfilment-smoke-validation.ts`. |
| 2b — Delivery & inspection | IP-03 | RT-06 and RT-07 — covered by `bp006-ip03-delivery-inspection-service-smoke-validation.ts`. |
| 3a — Exceptions | IP-04 | RT-09 — covered by `bp006-ip04-amendments-cancellation-returns-smoke-validation.ts`. |
| 3 — Exceptions & workspace | IP-04, IP-05 | RT-09, RT-10, RT-11 — IP-05 covered by `bp006-ip05-downstream-handoff-sales-workspace-smoke-validation.ts` |
| 4 — Certification | IP-06 | RT-12 (and regression of RT-01…RT-11) — covered by `bp006-ip06-sales-certification.ts` |

A wave is **not** complete until listed RTs pass — regardless of UI polish.

---

## Document Control

| Item | Value |
|------|-------|
| Pack scope | [Build Pack-006 Scope](./Build%20Pack-006%20Scope.md) |
| Certification IP | [IP-06](./IP-06%20Sales%20Certification.md) |
