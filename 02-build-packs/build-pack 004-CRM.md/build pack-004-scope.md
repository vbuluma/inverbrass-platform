# Build Pack 004 – Customer Relationship Management (CRM)

> **Canonical documentation:** [`Build Pack 004 - Customer Relationship Management/`](../Build%20Pack%20004%20-%20Customer%20Relationship%20Management/Build%20Pack-004%20Scope.md)

This folder retains legacy references. The authoritative BP-004 scope and IP specifications live in the folder above.

---

## Implementation Package Structure

| IP | Module |
|----|--------|
| IP-01 | CRM Foundation |
| IP-02 | Lead Management |
| IP-03 | Opportunity Management |
| IP-04 | Customer & Contact Management |
| IP-05 | Activity & Task Management |
| IP-06 | Calendar & Appointment Management |
| IP-07 | Customer Visit & Call Report Management |
| IP-08 | Communication Management |
| IP-09 | Case & Complaint Management |
| IP-10 | Quotations & Sales Pipeline |
| IP-11 | Campaign Management |
| IP-12 | CRM Analytics & Dashboards |
| IP-13 | CRM Governance & Administration |

---

## Architecture Boundary

| Build Pack | Responsibility |
|------------|----------------|
| BP-002 | Who the person or organisation is (Party) |
| BP-003 | What is offered (Offerings) |
| BP-004 | How we build and manage customer relationships (CRM) |
| BP-005+ | How we sell and fulfil (Sales, Orders, Billing) |

BP-004 extends Party Master (BP-002) with CRM relationship management. It deliberately stops before operational fulfilment and billing.

---

## Key Changes from Legacy IP Catalogue

The previous 15-IP structure (IP-001 Customer Profile through IP-015 Notes) has been consolidated into 13 operational IPs:

- **IP-04** merges customer accounts and contact role management (formerly separate IPs)
- **IP-07** introduces dedicated visit and call report management
- Party-owned capabilities (addresses, documents, relationships) remain in **BP-002**, consumed by CRM—not duplicated in BP-004

See the [full scope document](../Build%20Pack%20004%20-%20Customer%20Relationship%20Management/Build%20Pack-004%20Scope.md) for dependencies, deliverables, and quality gates.
