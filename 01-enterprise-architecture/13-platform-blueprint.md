---

PLATFORM_BLUEPRINT.md

# InverBrass Platform Blueprint

## Version: 1.0
Architecture Version: AV-1.5 (see [01b – Architecture Versions](./01b-Architecture-Versions.md))
Status: Approved

> **AV-1.5 Engine Catalog Lock:** ENG-003 sub-engines remain flat (003a–m); next ID **ENG-003n**. No renumbering or regrouping until AV-2.0.

# Purpose

This document defines the logical software structure of the InverBrass Platform.
It provides the technical blueprint that guides where capabilities belong, how modules interact, and how the platform evolves over time.

## This document is the primary architectural reference for software implementation.

# Platform Vision

## Build a configurable, enterprise-grade, multi-tenant business platform delivered as **Industry Editions powered by a shared enterprise platform** — reusable platform capabilities rather than industry-specific custom development.

Each edition (InverBrass Banking, InverBrass Property, InverBrass Healthcare, etc.) presents a purpose-built experience while sharing the same engines underneath.
The platform shall support cloud-native deployment while remaining deployable within customer-managed environments.



# Guiding Principles

The platform shall:

- Build reusable platform capabilities first.
- Prefer configuration over customization.
- Prefer metadata over hardcoded logic.
- Maintain loose coupling.
- Maintain high cohesion.
- Support multi-tenancy throughout.
- Be mobile-first.
- Be offline-capable where required.
- Be secure by design.
- Scale horizontally where appropriate.
- Minimize technical debt.
- Avoid orphan code.
- Store telephone numbers in canonical E.164 (EDS-003) via the shared phone normalizer.

---



# Platform Layers

The platform consists of six logical layers.

## Layer 1

Presentation Layer
Responsibilities

- Web UI
- Mobile PWA
- Responsive Design
- Accessibility
- Industry-native navigation and terminology (driven by ENG-003k)

---

## Layer 2

Application Layer
Responsibilities

- Business Services
- Workflow
- Validation
- Authorization
- API Endpoints

---

## Layer 3

Core Platform Services (Shared Platform Engines)

Shared capabilities used by all Industry Editions.

Includes

- Identity
- Configuration (including Industry Profiles)
- Industry Experience (ENG-003k)
- Checklist & Completion (ENG-003l)
- Portfolio & Roadmap (ENG-003m)
- Workflow
- Notification
- Payment
- Receipting
- Reconciliation
- Reporting
- AI Services
- Integration
- Audit
- File Management

---

## Layer 4

Industry Experience Layer (ENG-003k)

Responsibilities

- Industry Edition binding at onboarding
- Edition-specific navigation and menu visibility
- Terminology mapping (Customer / Patient / Tenant / Student)
- Dashboard layouts and landing pages
- Product type and workflow template filtering
- Feature visibility per edition

This layer sits between shared engines and tenant configuration. Build Packs remain shared; the Industry Experience Layer decides exposure and presentation.

---

## Layer 5

Industry Editions

Purpose-built product experiences assembled from Build Packs.

Examples

- InverBrass Banking (VS-009)
- InverBrass Property (VS-002)
- InverBrass Education (VS-003)
- InverBrass Healthcare (VS-004)
- InverBrass Retail (VS-001)
- InverBrass Agriculture (VS-005)
- InverBrass Hospitality (VS-006)

Each edition consumes Core Platform Services and Build Packs rather than duplicating them. Customers perceive each edition as a dedicated product.

---

## Layer 6

Infrastructure

Includes

- PostgreSQL
- Authentication
- Object Storage
- Logging
- Monitoring
- Caching
- External Integrations

## Infrastructure remains replaceable wherever practical.



# Platform Modules

The platform is organized into reusable modules.
Core modules include:

- Identity & Access
- Business Setup
- Configuration
- Customer Management
- Supplier Management
- Product Catalogue
- Pricing Engine
- Inventory
- Sales
- Payments
- Receipting
- Reconciliation
- CRM
- Workflow
- Notifications
- Reporting
- AI Services
- Integration
- Audit
- File Management

---



# Module Ownership Principles

Each module shall:

- Have a single primary responsibility.
- Own its business logic.
- Expose well-defined interfaces.
- Avoid direct dependency on unrelated modules.
- Reuse shared platform services.

---



# Dependency Rules

Dependencies shall flow inward.

Presentation

↓

Application

↓

Industry Experience Layer (ENG-003k)

↓

Platform Services

↓

Infrastructure

Industry Editions communicate through approved services and Build Packs rather than direct coupling.

Circular dependencies are prohibited.

---



# Cross-Cutting Concerns

The following apply across the platform:

- Security
- Multi-tenancy
- Audit
- Logging
- Validation
- Configuration
- Performance
- Monitoring
- Error Handling

---



# Build Pack Alignment

Development follows approved Build Packs.

Each Build Pack contributes functionality to one or more platform modules.

No functionality shall be implemented outside an approved Build Pack unless explicitly authorized.

---



# AI Development Principles

AI-assisted development shall:

- Follow approved engineering rules.
- Respect architecture boundaries.
- Reuse existing platform capabilities.
- Avoid duplicate implementations.
- Recommend improvements separately from requested functionality.

---

# Definition of Success

The platform is successful when:

- New Industry Editions can be onboarded primarily through configuration.
- Core services are reused across all editions.
- Each customer perceives their edition as purpose-built for their industry — never as a generic platform.
- Platform quality improves with each release.
- Technical debt remains controlled.
- Enterprise customers can deploy the platform confidently.

---

