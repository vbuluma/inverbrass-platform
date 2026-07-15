I want to introduce one rule that we'll follow throughout this project:
Every capability must have one and only one owner.
For example, Customer Management belongs to the Customer Domain. Property, School, Business Operations, Chama, and Academy all use it—they don't create their own customer management.
This principle will prevent duplication across the platform.
________________________________________
02 - Platform Module Catalog
1. Document Information
Attribute	Value
Document Name	Platform Module Catalog
Version	1.0
Purpose	Defines every platform capability, ownership, dependencies and reuse strategy.
Scope	Entire InverBrass Business Platform
Audience	Product Owner, Solution Architect, Developers, AI Coding Assistants
________________________________________
2. Platform Foundation
These are mandatory platform services used by every solution.
Capability	Purpose	Used By	Configurable	Future Extensible
Authentication	Login, MFA, Password Management	All	No	Yes
Tenant Management	Business registration and isolation	All	No	Yes
Subscription Management	Plans, licensing and billing	All	Yes	Yes
User Management	Platform users	All	Yes	Yes
Role & Permission Management	Access control	All	Yes	Yes
Configuration Management	Business settings	All	Yes	Yes
Audit & Activity Logging	Track all business activities	All	No	Yes
File & Document Management	Store files and attachments	All	Yes	Yes
________________________________________
3. Business Engines
Reusable processing engines.
Engine	Purpose	Used By	Configurable	Future Extensible
Workflow Engine	Approval workflows	All	Yes	Yes
Billing Engine	Bills and invoices	Most Solutions	Yes	Yes
Payment Engine	Payment processing	Most Solutions	Yes	Yes
Receipting Engine	Receipt generation	Most Solutions	Yes	Yes
Notification Engine	Email, SMS, WhatsApp, Push	All	Yes	Yes
Reporting Engine	Operational reporting	All	Yes	Yes
Integration Engine	External APIs	All	Yes	Yes
Enterprise Intelligence Engine	Rules, ML and GenAI	All	Yes	Yes
________________________________________
4. Business Capability Domains
Customer Domain
Capability	Purpose	Shared	Used By
CRM	Lead and customer relationship management	Yes	All Solutions
Customer Management	Customer records	Yes	All Solutions
Contact Management	Customer contacts	Yes	All Solutions
Communication History	Emails, Calls, WhatsApp	Yes	All Solutions
Tasks & Follow-ups	Customer follow-up activities	Yes	All Solutions
________________________________________
Sales & Commerce Domain
Capability	Purpose	Shared	Used By
Quotations	Sales quotations	Yes	Business Operations
Sales Orders	Customer orders	Yes	Business Operations
Invoicing	Customer invoicing	Yes	Business Operations, Property, Academy
Point of Sale	Fast retail sales	Yes	Business Operations
Returns	Sales returns	Yes	Business Operations
Promotions & Discounts	Campaigns and offers	Yes	Business Operations
________________________________________
Inventory Domain
Capability	Purpose	Shared	Used By
Product Management	Products and services	Yes	Business Operations
Categories	Product grouping	Yes	Business Operations
Stock Management	Inventory control	Yes	Business Operations
Warehouses	Stock locations	Yes	Business Operations
Stock Adjustments	Inventory corrections	Yes	Business Operations
Procurement	Purchasing and supplier orders	Yes	Business Operations
________________________________________
Finance Domain
Capability	Purpose	Shared	Used By
Billing	Bills and invoices	Yes	Most Solutions
Payments	Payment allocation	Yes	Most Solutions
Receipts	Customer receipts	Yes	Most Solutions
Expenses	Expense tracking	Yes	Business Operations
Cash Management	Cash reconciliation	Yes	Business Operations
Tax Management	Tax calculations and configuration	Yes	Most Solutions
________________________________________
Operations Domain
Capability	Purpose	Shared	Used By
Scheduling	Appointments and bookings	Yes	Property, Academy, Future Solutions
Work Orders	Service job management	Yes	Property, Business Operations
Asset Management	Business assets	Yes	Business Operations, Property
Document Management	Business documents	Yes	All Solutions
Checklists	Operational task lists	Yes	Future Solutions
________________________________________
Intelligence Domain
Capability	Purpose	Shared	Used By
Business Rules	Configurable rule execution	Yes	All Solutions
Machine Learning	Predictions and anomaly detection	Yes	All Solutions
Generative AI	Business assistant and summaries	Yes	All Solutions
Decision Support	Recommendations and insights	Yes	All Solutions
________________________________________
5. Industry Solutions
Solution	Built Using
Business Operations	Customer, CRM, Inventory, Sales, Finance, Operations
Property Management	Customer, CRM, Finance, Workflow, Documents
School Management	Customer, CRM, Finance, Workflow, Scheduling
Chama Management	Customer, CRM, Finance, Workflow
SME Academy	Customer, CRM, Finance, Scheduling, Documents
________________________________________
6. Configuration Philosophy
Principle	Description
Configuration over Development	Business behaviour should be changed through settings, not code.
Feature Toggle	Capabilities can be enabled or disabled per tenant.
Business Type Templates	Predefined templates (Shop, Salon, Restaurant, Pharmacy, Car Wash, etc.) configure the Business Operations solution.
Progressive Feature Enablement	Start with essential features and unlock advanced capabilities as businesses grow.
Self-Service Setup	Business owners configure the platform through guided setup without requiring technical support.
________________________________________
7. Capability Ownership Principles
Principle	Description
Single Owner	Every capability has one owning domain.
Reuse First	Existing capabilities must be reused before creating new ones.
API First	Capabilities expose services through APIs.
Loose Coupling	Capabilities communicate through well-defined interfaces.
Mobile First	Every capability must provide a mobile-optimized experience.
Offline First	Critical business processes continue without connectivity and synchronize later.
________________________________________

Industry Solution Configuration Principle
Principle	Description
Industry Solutions	Industry solutions are assembled from reusable business capabilities and delivered primarily through configuration rather than custom development.
Business Templates	Every industry solution may provide one or more preconfigured business templates that enable rapid self-service onboarding.
Reusable Capabilities	Templates reuse Platform Foundation, Business Engines and Business Capabilities without duplicating functionality.
Extensibility	New industry templates can be introduced through configuration with minimal or no code changes wherever possible.
Then your examples become:
Industry Solution	Business Template	Uses Capabilities
Business Operations	Retail Shop	Business Operations + CRM + Inventory + Finance
Business Operations	Restaurant	Business Operations + Tables + Kitchen + Finance
Business Operations	Salon	Business Operations + Bookings + CRM + Finance
Business Operations	Car Wash	Business Operations + Vehicles + Services + Finance
Business Operations	Pharmacy	Business Operations + Inventory + Finance + Compliance
