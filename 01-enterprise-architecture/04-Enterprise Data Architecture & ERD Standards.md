I like the direction we're taking, but I want to make one important architectural improvement.
Document 04 should not contain the actual ERD diagrams or every table definition.
Why?
Because your platform is going to be very large (Business Operations alone could exceed 150 tables). Putting all of that into one document will make it difficult to maintain and hard for AI to use effectively.
Instead, I recommend:
•	Document 04 = Enterprise Data Architecture & ERD Standards (this document)
•	Later, when we build each capability, we create its detailed ERD (e.g., Business Operations ERD, Property ERD, School ERD). These become implementation artifacts.
This keeps the architecture clean while allowing the database to evolve.
________________________________________
04 – Enterprise Data Architecture & ERD Standards
1. Document Information
Attribute	Value
Document Name	Enterprise Data Architecture & ERD Standards
Version	1.0
Purpose	Defines the enterprise data architecture principles, entity standards, relationships and modelling guidelines that govern the InverBrass Business Platform.
Scope	Entire InverBrass Business Platform
Audience	Solution Architects, Database Designers, Developers, AI Coding Assistants
________________________________________
2. Data Architecture Principles
Principle	Description
Multi-Tenant First	Every tenant-owned business entity shall be logically isolated using tenant_id.
Configuration First	Business behaviour shall be driven through configuration and templates before introducing custom database structures.
UUID Primary Keys	All primary keys shall use UUIDs to support distributed systems and offline synchronization.
Audit by Design	Every business entity shall support complete auditability.
Soft Delete	Records shall be archived using deleted_at instead of physical deletion wherever appropriate.
Offline First	Business entities shall support synchronization metadata for offline operation.
API First	Entities shall expose data through APIs rather than direct database access.
Single Source of Truth	Each business concept shall have one authoritative entity within the platform.
Capability Reuse	Entities shall be reused across Industry Solutions wherever applicable.
Mobile Optimized	Data structures shall support lightweight mobile interactions and efficient synchronization.
________________________________________
3. Standard Base Entity Model
Every tenant-owned business entity should inherit the following common attributes.
Field	Description
id	UUID Primary Key
tenant_id	Business owner / tenant identifier
status	Business status
created_at	Record creation timestamp
created_by	User who created the record
updated_at	Last modification timestamp
updated_by	User who last modified the record
deleted_at	Soft delete timestamp
version	Optimistic concurrency/version number
sync_status	Offline synchronization status
last_synced_at	Last successful synchronization timestamp
________________________________________
4. Relationship Standards
Relationship Type	Standard
One-to-One	Used only where entities have a mandatory exclusive relationship.
One-to-Many	Preferred relationship model across the platform.
Many-to-Many	Implement using junction tables.
Lookup Values	Managed through configuration/reference tables rather than hard-coded values.
Hierarchies	Parent-child relationships shall support unlimited nesting where business requires.
________________________________________
5. Entity Classification
Classification	Description	Examples
Platform Entity	Supports platform operation.	User, Tenant, Role
Shared Business Entity	Reused across multiple Industry Solutions.	Customer, Product, Payment
Industry Entity	Specific to one Industry Solution.	Property, Student, Chama Group
Intelligence Entity	Supports Rules, ML and GenAI.	Rule, Prediction, AI Conversation
Configuration Entity	Controls platform behaviour through configuration.	Business Template, Feature Toggle, Tax Rule
________________________________________
6. Data Ownership Principles
Principle	Description
Single Owner	Every entity has one owning business capability.
Shared Access	Entities may be consumed by multiple Industry Solutions through APIs.
No Duplication	Business entities shall not be duplicated across domains.
Extensibility	Additional attributes should be introduced through extension or configuration models where practical.
________________________________________
7. Configuration Data Standards
Standard	Description
Business Templates	Business templates define default configurations for each business type.
Feature Toggles	Features are enabled or disabled through configuration.
Reference Data	Lookup values are maintained in configurable reference tables.
Tenant Overrides	Individual tenants may override default configurations where permitted.
________________________________________
8. Audit & Compliance Standards
Standard	Description
Full Audit Trail	All business transactions shall be traceable.
Immutable Transactions	Financial transactions shall not be physically deleted.
User Accountability	All significant actions shall capture the initiating user.
Regulatory Readiness	Data structures shall support audit, reporting and regulatory requirements.
________________________________________
9. Offline Synchronization Standards
Standard	Description
Local First	Mobile applications shall continue operating without connectivity.
Incremental Sync	Only changed records are synchronized.
Conflict Resolution	Synchronization conflicts shall follow configurable resolution rules.
Sync Metadata	Synchronization status shall be maintained for applicable entities.
________________________________________
10. Performance Standards
Standard	Description
Indexing	Frequently queried columns shall be indexed appropriately.
Pagination	Large datasets shall support pagination.
Lazy Loading	Related data shall be retrieved only when required.
Archiving	Historical data shall be archived according to retention policies.
Query Optimization	Queries shall be designed for mobile and low-bandwidth environments.
________________________________________
11. Security Standards
Standard	Description
Tenant Isolation	Data shall never be exposed across tenants.
Least Privilege	Access is governed by roles and permissions.
Sensitive Data Protection	Personally identifiable and financial data shall be protected.
Encryption	Sensitive data shall be encrypted at rest and in transit.
Secure APIs	All entity access shall occur through authenticated and authorized APIs.
________________________________________
12. Design Principles
Principle	Description
Mobile First	Data structures should minimize network traffic and support fast mobile experiences.
Self-Service First	Data models should support intuitive business setup and configuration.
Configuration Over Customization	Extend behaviour through configuration before altering schemas.
Engine & Module Separation	Core Engines own reusable processing logic. Domain Modules own business workflows and user interactions.
Capability Reuse Before Creation	Reuse existing entities and capabilities before introducing new ones.
Enterprise Intelligence Ready	All domains should support Business Rules, Machine Learning and Generative AI where applicable.
________________________________________
13. Enterprise Data Standards (EDS)

| Standard | Statement |
|---|---|
| EDS-001 | Tenant-owned business entities shall include the Standard Base Entity fields (Section 3), including soft delete and audit columns where applicable. |
| EDS-002 | Each business concept shall have one authoritative entity (Single Source of Truth). Industry Solutions consume shared entities through APIs rather than duplicating tables. |
| EDS-003 | All telephone numbers shall be stored in canonical E.164 format. User input may be entered in local or international formats, but the platform shall normalize before validation, duplicate detection, integration, and persistence. |
| EDS-009 | Addresses shall use a generic administrative hierarchy model. Country-specific labels and hierarchy levels shall come from the Localization & Regulatory Engine (ENG-003b), not hardcoded field names. |

### EDS-003 – Telephone Number Canonicalization

**Canonical storage:** `+[country calling code][national significant number]` (example: `+254722134343`).

**Accepted user input (examples for Kenya / +254):**
- Local with trunk prefix: `0722134343`
- Local without trunk prefix: `722134343`
- International without plus: `254722134343`
- E.164: `+254722134343`
- Formatted variants: `(0722) 134-343`, `0722 134 343`

**Rules:**
1. Normalization shall use the Party/Business operating country dialing code from the Localization & Regulatory Engine when available.
2. Normalization shall occur centrally in the shared phone validation/normalization utility — not ad hoc in UI components or repositories.
3. Duplicate detection shall compare normalized E.164 values so equivalent numbers cannot be registered twice.
4. Platform Registration, Party Contacts, Organizational Units, Employees, Customers, Suppliers, and all future Build Packs shall reuse the same utility.

**Implementation location:** `03-platform/src/core/shared/phone` (compatibility re-export: `core/auth/utils/phone-normalizer`).

### EDS-009 – Address Standardization

**Storage model:** Generic hierarchy fields — `country_code`, `state_province`, `county_district`, `city_town`, `ward_locality`, plus lines, postal code, landmark, and optional GPS coordinates.

**Rules:**
1. Do not hardcode country-specific administrative level names (e.g. "County" for Kenya only) in the persistence model.
2. UI labels and hierarchy order shall be resolved from the Localization & Regulatory Engine when available.
3. Country is mandatory; GPS coordinates are optional.
4. Party Address, Organizational Units, Business Setup branches, Customer, Supplier, and all future Build Packs shall reuse the same address field model.

**Implementation location:** `03-platform/src/core/shared/address` (generic labels until ENG-003b supplies country-specific hierarchy).

### ENG-003c – Organization Structure Engine

**Purpose:** Reusable internal structure for Organization Parties — departments, branches, campuses, warehouses, and other unit types — without creating duplicate Party records.

**Canonical entity:** `organizational_unit` (child of Organization Party via `organization_party_id`).

**Future Build Packs** shall reference `organizational_unit_id` for employees, inventory, sales, receipts, assets, projects, appointments, and related capabilities.

**Implementation location:** `03-platform/src/modules/party/services/organizational-unit-service.ts`, `organizational-unit-repository.ts`, Party Workspace **Organization Structure** tab.

### ENG-003j – Identity & Regulatory Identification Engine

**Purpose:** Capture official regulatory identifiers (National ID, KRA PIN, VAT Number, Business Registration Number, etc.) as Party master data.

**Canonical entity:** `party_identity_identifier` (tenant-scoped, soft-deletable, optimistic locking via `version`).

**Configuration entities (ENG-003b):** `identifier_type`, `required_identifier` — no country-specific identifier types hardcoded in consumer modules.

**Evidence separation:** `linked_document_id` references `party_document` for uploaded evidence. Document binaries and metadata remain owned by the Document & Compliance capability — never duplicated on the identifier row.

**Security:** Identifier values shall be masked in UI by default. Full-value viewing requires explicit authorization.

**Implementation location:** `03-platform/src/core/identity-regulatory/`, Party Workspace **Identity & Regulatory** tab, onboarding step `/parties/[partyId]/onboarding/identity-regulatory`.

________________________________________
Architect's Recommendation
This document should be treated as the enterprise data standard, not as the implementation database design.
When we begin development, we'll create domain-specific ERDs (for example, Business Operations ERD, Property Management ERD, and School Management ERD) that conform to these standards.
This approach has three major benefits:
1.	Maintainability – Each ERD remains focused and manageable.
2.	AI-assisted development – Cursor can work on one bounded domain at a time without being overwhelmed by hundreds of tables.
3.	Scalability – New Industry Solutions can be added without continually rewriting a monolithic enterprise ERD.
I recommend we adopt this as the long-term data architecture strategy for InverBrass. It aligns well with your goals of a configurable, mobile-first, self-service platform that can grow over many years while remaining understandable to both developers and AI coding assistants.

