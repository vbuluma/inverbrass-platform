Build Pack 003 – Product & Service Catalogue

> **Industry-native delivery:** The Product Catalogue is a shared Build Pack consumed by all Industry Editions. Product types, attribute schemas, and creation forms shown to users are filtered by the business's **Industry Experience Profile (ENG-003k)**. A bank sees Loan Product and Deposit Product — not Rental Unit or Medical Procedure. Same Product Engine; different UI.

Attribute	Description
Build Pack ID	BP-003
Name	Product & Service Catalogue
Platform Domain	Core Business Operations
Primary Engine	Product Intelligence Engine (ENG-003f)
Depends On	BP-001 Business Setup & Onboarding, BP-002 Party & Relationship Management
Consumed By	All Industry Editions (via Industry Experience Profiles)
Priority	High
Objective	Provide a configurable enterprise Product Catalogue capable of managing any offering (physical, digital, financial, service, rental, subscription, insurance, education, healthcare, agriculture, hospitality, etc.) throughout its complete lifecycle—from ideation to retirement. Presentation is industry-native; the engine is shared.
________________________________________
Business Objectives
Objective ID	Objective
OBJ-001	Create one enterprise catalogue shared across all industries.
OBJ-002	Eliminate duplicate product definitions across verticals.
OBJ-003	Support configurable product attributes rather than hardcoded fields.
OBJ-004	Support product governance and lifecycle management.
OBJ-005	Enable omnichannel digital catalogues.
OBJ-006	Support AI-driven product analytics and recommendations.
OBJ-007	Support migration of existing products and onboarding of new products.
OBJ-008	Support complete product ownership, delivery responsibility, budgeting and roadmap management (roadmap via ENG-003m when implemented).
________________________________________
Supported Product Types
Category	Examples
Physical Products	Phones, Laptops, Fertilizer
Services	Consultation, Cleaning, Repairs
Rental Assets	Houses, Vehicles, Equipment
Digital Products	E-books, Licences
Subscription Plans	Monthly Internet
Memberships	Club Membership
Insurance Products	Motor Cover
Financial Products	Loans, Savings Accounts
Education Products	Courses
Hospitality	Rooms, Packages
Agriculture	Livestock, Inputs
Healthcare	Procedures, Medicines
Government Services	Licences, Permits
________________________________________
Implementation Packages
IP	Name	Purpose	Status
IP-001	Product & Service Foundation	Master product catalogue	Frozen
IP-002	Categories & Classification	Product hierarchy	Complete
IP-003	Units of Measure	Standard measurement engine	Complete
IP-004	Product Attributes Engine	Metadata-driven attributes	Complete
IP-005	Product Variants	Size, colour, storage etc.	Complete
IP-006	Bundles & Packages	Composite offerings	Complete
IP-007	Digital Catalogue	Website, Mobile, WhatsApp	Complete
IP-008	Product Lifecycle	Draft → Active → Retired	Complete
IP-009	Product Documents & Compliance	Images, manuals, certificates, compliance matrix	Complete
IP-010	Product Relationships	Compatible, Accessory, Cross-sell	Complete
IP-011	Pricing & Pricing Rules	Commercial pricing configuration	Complete
IP-012	Offering Analytics & Performance	Performance KPIs and dashboard	Complete
IP-013	Offering Governance	Owners, readiness, stewardship	**In scope — final BP-003 IP**
IP-014	Offering Roadmap & Release Management	~~Product roadmap and releases~~	**Retired → ENG-003m**
IP-015	Product Intelligence	AI analytics, recommendations	**Deferred → ENG-003f / BP-013**

> **Delivery boundary (AV-1.5):** BP-003 **freezes after IP-013**. Roadmap and release planning moves to **ENG-003m Portfolio & Roadmap Engine** (platform). Product intelligence analytics moves to **ENG-003f** and **BP-013 Product Management & Innovation** when operational data from Sales, Inventory, and CRM Build Packs is available.
________________________________________
Product Lifecycle
Idea
   │
Business Case
   │
Approval
   │
Planning
   │
MVP
   │
Build
   │
Testing
   │
Launch
   │
Growth
   │
Maturity
   │
Decline
   │
Reinvent / Retire
________________________________________
Product Governance
Each product should include:
Area	Examples
Vision	Product purpose
Objectives	Strategic objectives
Business Case	Financial justification
Personas	Target users
Owner	Product Owner
Business Sponsor	Executive sponsor
Technical Owner	Architecture owner
Delivery Manager	Implementation owner
Budget	Approved funding
Timeline	Planned dates
Roadmap	Releases
Risks	Product risks
KPIs	Success measures
GTM	Go-to-market strategy
Customer Feedback	Voice of Customer
Enhancements	Product backlog
________________________________________
Ownership Model
A product can have many accountable people.
Responsibility	Owner
Executive Sponsor	1
Product Owner	1
Business Analyst	Many
Project Manager	Many
Technical Lead	Many
Development Team	Many
QA Team	Many
Operations	Many
Sales	Many
Marketing	Many
Support	Many
________________________________________
Resource Management
Each implementation initiative should support:
Area
Budget
Forecast
Actual Cost
Planned Duration
Actual Duration
Resource Allocation
Time Tracking
Milestones
Risks
Benefits Realization
________________________________________
AI Capabilities (ENG-003f)
The Product Intelligence Engine should answer questions such as:
•	Which products are declining? 
•	Which products should be retired? 
•	Which products need reinvestment? 
•	Which features drive adoption? 
•	Which releases caused customer satisfaction changes? 
•	Which personas are underserved? 
•	Which products generate the highest revenue? 
•	Which products consume excessive support effort? 
•	Which roadmap items should be prioritised? 
•	Which enhancements deliver the greatest business value? 
________________________________________
Consumers
This Build Pack will be reused by every vertical:
Vertical	Consumption
Retail	Merchandise
Property	Properties, Rental Units
Healthcare	Services, Procedures
Education	Courses, Fees
Hospitality	Rooms, Packages
Agriculture	Crops, Livestock
Banking	Financial Products
Insurance	Insurance Covers
Government	Licences
Manufacturing	Finished Goods
NGOs	Programmes and Services
________________________________________
Engine Dependencies
Engine	Purpose
ENG-003a Configuration Engine	Product configuration, Industry Profiles
ENG-003k Industry Experience Engine	Product type visibility and edition-specific templates
ENG-003b Localization & Regulatory Engine	Country-specific rules
ENG-003l Checklist & Completion Engine	Product creation and compliance checklists (document matrix, readiness gates)
ENG-003m Portfolio & Roadmap Engine	Offering roadmap and release planning (consumption — not implemented in BP-003)
ENG-003f Product Intelligence Engine	Offering analytics and AI insights (deferred to BP-013 / post-freeze)
ENG-004 Rules Engine	Pricing and eligibility
ENG-005 Workflow Engine	Product approvals
ENG-009 Notification Engine	Product notifications
ENG-011 Reporting Engine	Product reporting
ENG-012 AI Engine	Product insights
ENG-013 Audit Engine	Audit trail
ENG-015 Document Engine	Product documents
ENG-016 Search Engine	Global catalogue search
________________________________________
One recommendation before we start building BP-003
I would split BP-003 into two logical workstreams while keeping it as a single Build Pack for governance:
1.	Catalogue Foundation (IP-001 to IP-012) – Defines products, categories, attributes, variants, lifecycle, documents, timeline, audit, and relationships. This is the reusable engine consumed by all verticals. 
2.	Offering Governance (IP-013) – Ensures every offering is enterprise-ready with ownership, readiness scoring, and stewardship. **This is the final BP-003 delivery scope (AV-1.5).**
3.	**Deferred to platform engines:** Roadmap and release planning → **ENG-003m**. Product intelligence and AI → **ENG-003f / BP-013**.

________________________________________
Foundation Freeze (BP-001, BP-002, BP-003 IP-001)

The following implementation packages are **frozen** — foundational schemas and core patterns should not be revisited unless a genuine architectural gap is identified:

| Build Pack | Frozen IP | Scope |
|------------|-----------|-------|
| BP-001 | IP-001 | Business registration, onboarding, profile, configuration |
| BP-002 | IP-001 through IP-012 | Party master, relationships, timeline, audit, documents |
| BP-003 | IP-001 | Offering master (`product_*` tables), timeline, audit, migration |

**Discipline:** Complete remaining IPs and apply improvements through **ENG-003k Industry Experience Engine** and UI presentation rather than restructuring frozen foundations.

**BP-003 internal term:** Developers use **Offering Engine**; users see industry-native catalogue labels. Database retains `product_*` naming.

