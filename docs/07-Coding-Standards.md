________________________________________
07 – Development Standards & Coding Guidelines
1. Document Information
Attribute	Value
Document Name	Development Standards & Coding Guidelines
Version	1.0
Purpose	Defines the software engineering, coding, testing and maintainability standards for the InverBrass Business Platform.
Scope	Entire InverBrass Business Platform
Audience	Developers, Solution Architects, AI Coding Assistants
________________________________________
2. Technology Stack Standards
Layer	Standard Technology
Frontend	Next.js (App Router)
Language	TypeScript
Styling	Tailwind CSS
UI Components	shadcn/ui
Backend	Next.js Server Actions & Route Handlers
Database	PostgreSQL (Supabase)
ORM	Drizzle ORM
Authentication	Supabase Auth
Validation	Zod
Forms	React Hook Form
Data Fetching	TanStack Query
Mobile Strategy	Progressive Web App (PWA)
________________________________________
3. Standard Project Structure
Folder	Responsibility
src/app	Application routing and pages
src/core	Core Engines (Workflow, Payments, Notifications, AI, Reporting, Integrations)
src/modules	Business Capabilities and Industry Solutions
src/shared	Shared business logic and reusable services
src/components	Reusable UI components
src/hooks	Custom React hooks
src/lib	Utilities and helper libraries
src/integrations	External systems and third-party connectors
src/config	Configuration, templates and feature flags
src/types	Shared TypeScript types and interfaces
________________________________________
4. Development Principles
Principle	Description
Single Responsibility	Every function and component should have one clear purpose.
DRY	Avoid duplicated logic.
KISS	Prefer simple solutions over unnecessary complexity.
SOLID	Apply SOLID principles where appropriate.
Composition Over Inheritance	Build reusable components through composition.
Configuration Before Customization	Extend behaviour through configuration before code changes.
Capability Reuse Before Creation	Reuse existing capabilities before introducing new ones.
Engine & Module Separation	Business processing belongs in Core Engines; business workflows belong in Domain Modules.
________________________________________
5. Naming Standards
Item	Convention
Components	PascalCase
Functions	camelCase
Variables	camelCase
Interfaces	PascalCase
Enums	PascalCase
Database Tables	snake_case
Database Columns	snake_case
Routes	kebab-case
Files	kebab-case
Folders	kebab-case
________________________________________
6. Component Standards
Component	Standard
Page	One business purpose per page
Component	Small, reusable and composable
Forms	React Hook Form + Zod
Tables	Shared table component
Dialogs	Shared modal components
Charts	Shared chart components
Cards	Shared card components
________________________________________
7. Database Standards
Standard	Description
UUID Keys	All primary keys use UUIDs.
Tenant Isolation	Tenant-owned entities include tenant_id.
Audit Fields	Standard audit fields on business entities.
Soft Delete	Use deleted_at instead of hard deletes where applicable.
Transactions	Multi-step business operations execute within transactions.
Indexing	Index frequently queried fields.
________________________________________
8. API Development Standards
Standard	Description
API First	Expose reusable business functionality through APIs.
Validation	Validate all requests using Zod.
Error Handling	Return standardized error responses.
Authentication	Secure endpoints by default.
Authorization	Enforce role-based access.
________________________________________
9. Secure Coding Standards
Standard	Description
Input Validation	Validate all external input.
Parameterized Queries	Prevent SQL injection through ORM usage.
Secrets Management	Never hard-code credentials or API keys.
Environment Variables	Store sensitive configuration outside source code.
Least Privilege	Grant the minimum permissions required.
Dependency Management	Keep libraries updated and review vulnerabilities regularly.
________________________________________
10. State Management Standards
State	Standard
Server State	TanStack Query
Client State	React Context or lightweight state management as appropriate
Forms	React Hook Form
Offline Cache	Local storage/IndexedDB with synchronization support
________________________________________
11. Error Handling Standards
Standard	Description
Friendly Messages	Present clear business-friendly error messages.
Technical Logging	Record detailed diagnostic information.
Retry Logic	Support retries for recoverable failures.
Fallback UI	Display graceful fallback interfaces.
Validation First	Prevent processing invalid data.
________________________________________
12. Testing Standards
Test Type	Standard
Unit Tests	Business logic and utilities
Integration Tests	APIs and database interactions
End-to-End Tests	Critical business journeys
Regression Tests	Prevent reintroduction of defects
________________________________________
13. Git Standards
Standard	Description
Branch Strategy	Feature-based branching
Commit Messages	Clear, descriptive and business-focused
Pull Requests	Peer review before merge (or AI-assisted review for solo development)
Versioning	Semantic Versioning
________________________________________
14. AI Coding Standards
Standard	Description
Cursor Compliance	Generated code must comply with .cursorrules.
Explainable Code	Every complex function includes business-focused documentation explaining purpose, inputs, outputs and rationale.
No Duplicate Logic	Reuse existing capabilities before creating new implementations.
Architecture Compliance	Generated code must align with the architecture documents.
Business Traceability	Code should be traceable to capabilities and business requirements where practical.
________________________________________
15. Performance Standards
Standard	Description
Lazy Loading	Load modules only when required.
Code Splitting	Reduce initial bundle size.
Pagination	Avoid loading large datasets.
Caching	Cache frequently used data appropriately.
Image Optimization	Optimize images for web and mobile.
Offline Optimization	Minimize synchronization payloads.
________________________________________
16. Architecture Compliance
Rule	Description
Business Requirements	Code must implement approved business requirements.
Enterprise Architecture	Code must comply with architecture documents.
Domain Ownership	Respect domain boundaries and capability ownership.
Engine & Module Separation	Do not bypass Core Engines.
Cursor Rules	Generated code must comply with .cursorrules.
________________________________________
17. Maintainability Standards
Principle	Description
Explainable Code	Document the business purpose of non-trivial code.
Readability	Optimize for clarity over cleverness.
Consistency	Follow established naming and project conventions.
Reusability	Build reusable components and services.
Minimal Complexity	Keep implementations as simple as possible while meeting requirements.
Refactoring	Continuously improve code quality without changing behaviour.
________________________________________
Excellent questions. Before I output the document, let me answer the second question because it's an important architectural decision.
1. Should we include Security & Privacy here?
Partially, yes—but not completely.
Think of the documents like this:
Document	Purpose
07 – Development Standards & Coding Guidelines	How developers (and Cursor) should write code. Includes secure coding practices.
08 – AI & Intelligence Architecture	Rules Engine → ML → GenAI architecture, governance and explainability.
09 – Security, Privacy & Governance Architecture	Enterprise security, privacy, compliance, RBAC, encryption, backup, disaster recovery, data retention, audit, monitoring, secrets management, GDPR/Kenya Data Protection Act readiness, OWASP, etc.
So Document 07 will contain Secure Coding Standards, while Document 09 will contain the enterprise security architecture.
________________________________________
2. Every code explained for maintainability
I think this is one of the best decisions you've made.
As a solo founder using AI, your biggest risk isn't writing code—it's understanding it six months later.
I recommend making this a non-negotiable standard.
Instead of simply saying "comment your code," let's define an Explainability Standard.
Example:
Principle	Description
Explainable Code	Every business function, complex algorithm, workflow, integration, and reusable component shall include clear documentation explaining its purpose, business context, inputs, outputs, dependencies, and expected behaviour. Comments should explain why the code exists rather than restating what the code does.
For example:
/**
 * Purpose:
 * Allocates a customer payment across one or more outstanding invoices.
 *
 * Business Context:
 * A single payment may settle multiple invoices either fully or partially.
 * This function ensures allocations are recorded consistently and remain auditable.
 *
 * Inputs:
 * - paymentId
 * - invoiceIds
 * - allocationAmounts
 *
 * Output:
 * Creates payment allocation records and updates invoice balances.
 */
This is much more valuable than comments like:
// Loop through invoices
________________________________________
07 – Development Standards & Coding Guidelines
1. Document Information
Attribute	Value
Document Name	Development Standards & Coding Guidelines
Version	1.0
Purpose	Defines the software engineering, coding, testing and maintainability standards for the InverBrass Business Platform.
Scope	Entire InverBrass Business Platform
Audience	Developers, Solution Architects, AI Coding Assistants
________________________________________
2. Technology Stack Standards
Layer	Standard Technology
Frontend	Next.js (App Router)
Language	TypeScript
Styling	Tailwind CSS
UI Components	shadcn/ui
Backend	Next.js Server Actions & Route Handlers
Database	PostgreSQL (Supabase)
ORM	Drizzle ORM
Authentication	Supabase Auth
Validation	Zod
Forms	React Hook Form
Data Fetching	TanStack Query
Mobile Strategy	Progressive Web App (PWA)
________________________________________
3. Standard Project Structure
Folder	Responsibility
src/app	Application routing and pages
src/core	Core Engines (Workflow, Payments, Notifications, AI, Reporting, Integrations)
src/modules	Business Capabilities and Industry Solutions
src/shared	Shared business logic and reusable services
src/components	Reusable UI components
src/hooks	Custom React hooks
src/lib	Utilities and helper libraries
src/integrations	External systems and third-party connectors
src/config	Configuration, templates and feature flags
src/types	Shared TypeScript types and interfaces
________________________________________
4. Development Principles
Principle	Description
Single Responsibility	Every function and component should have one clear purpose.
DRY	Avoid duplicated logic.
KISS	Prefer simple solutions over unnecessary complexity.
SOLID	Apply SOLID principles where appropriate.
Composition Over Inheritance	Build reusable components through composition.
Configuration Before Customization	Extend behaviour through configuration before code changes.
Capability Reuse Before Creation	Reuse existing capabilities before introducing new ones.
Engine & Module Separation	Business processing belongs in Core Engines; business workflows belong in Domain Modules.
________________________________________
5. Naming Standards
Item	Convention
Components	PascalCase
Functions	camelCase
Variables	camelCase
Interfaces	PascalCase
Enums	PascalCase
Database Tables	snake_case
Database Columns	snake_case
Routes	kebab-case
Files	kebab-case
Folders	kebab-case
________________________________________
6. Component Standards
Component	Standard
Page	One business purpose per page
Component	Small, reusable and composable
Forms	React Hook Form + Zod
Tables	Shared table component
Dialogs	Shared modal components
Charts	Shared chart components
Cards	Shared card components
________________________________________
7. Database Standards
Standard	Description
UUID Keys	All primary keys use UUIDs.
Tenant Isolation	Tenant-owned entities include tenant_id.
Audit Fields	Standard audit fields on business entities.
Soft Delete	Use deleted_at instead of hard deletes where applicable.
Transactions	Multi-step business operations execute within transactions.
Indexing	Index frequently queried fields.
________________________________________
8. API Development Standards
Standard	Description
API First	Expose reusable business functionality through APIs.
Validation	Validate all requests using Zod.
Error Handling	Return standardized error responses.
Authentication	Secure endpoints by default.
Authorization	Enforce role-based access.
________________________________________
9. Secure Coding Standards
Standard	Description
Input Validation	Validate all external input.
Parameterized Queries	Prevent SQL injection through ORM usage.
Secrets Management	Never hard-code credentials or API keys.
Environment Variables	Store sensitive configuration outside source code.
Least Privilege	Grant the minimum permissions required.
Dependency Management	Keep libraries updated and review vulnerabilities regularly.
________________________________________
10. State Management Standards
State	Standard
Server State	TanStack Query
Client State	React Context or lightweight state management as appropriate
Forms	React Hook Form
Offline Cache	Local storage/IndexedDB with synchronization support
________________________________________
11. Error Handling Standards
Standard	Description
Friendly Messages	Present clear business-friendly error messages.
Technical Logging	Record detailed diagnostic information.
Retry Logic	Support retries for recoverable failures.
Fallback UI	Display graceful fallback interfaces.
Validation First	Prevent processing invalid data.
________________________________________
12. Testing Standards
Test Type	Standard
Unit Tests	Business logic and utilities
Integration Tests	APIs and database interactions
End-to-End Tests	Critical business journeys
Regression Tests	Prevent reintroduction of defects
________________________________________
13. Git Standards
Standard	Description
Branch Strategy	Feature-based branching
Commit Messages	Clear, descriptive and business-focused
Pull Requests	Peer review before merge (or AI-assisted review for solo development)
Versioning	Semantic Versioning
________________________________________
14. AI Coding Standards
Standard	Description
Cursor Compliance	Generated code must comply with .cursorrules.
Explainable Code	Every complex function includes business-focused documentation explaining purpose, inputs, outputs and rationale.
No Duplicate Logic	Reuse existing capabilities before creating new implementations.
Architecture Compliance	Generated code must align with the architecture documents.
Business Traceability	Code should be traceable to capabilities and business requirements where practical.
________________________________________
15. Performance Standards
Standard	Description
Lazy Loading	Load modules only when required.
Code Splitting	Reduce initial bundle size.
Pagination	Avoid loading large datasets.
Caching	Cache frequently used data appropriately.
Image Optimization	Optimize images for web and mobile.
Offline Optimization	Minimize synchronization payloads.
________________________________________
16. Architecture Compliance
Rule	Description
Business Requirements	Code must implement approved business requirements.
Enterprise Architecture	Code must comply with architecture documents.
Domain Ownership	Respect domain boundaries and capability ownership.
Engine & Module Separation	Do not bypass Core Engines.
Cursor Rules	Generated code must comply with .cursorrules.
________________________________________
17. Maintainability Standards
Principle	Description
Explainable Code	Document the business purpose of non-trivial code.
Readability	Optimize for clarity over cleverness.
Consistency	Follow established naming and project conventions.
Reusability	Build reusable components and services.
Minimal Complexity	Keep implementations as simple as possible while meeting requirements.
Refactoring	Continuously improve code quality without changing behaviour.
________________________________________
Principle	Description
Explainable Code	Every business function, complex algorithm, workflow, integration, and reusable component shall include clear documentation explaining its purpose, business context, inputs, outputs, dependencies, and expected behaviour. Comments should explain why the code exists rather than restating what the code does.
For example:
/**
 * Purpose:
 * Allocates a customer payment across one or more outstanding invoices.
 *
 * Business Context:
 * A single payment may settle multiple invoices either fully or partially.
 * This function ensures allocations are recorded consistently and remain auditable.
 *
 * Inputs:
 * - paymentId
 * - invoiceIds
 * - allocationAmounts
 *
 * Output:
 * Creates payment allocation records and updates invoice balances.

18. Architecture Compliance Checklist
Before merging any feature, verify:
Check	Required
Aligns with Business Requirements	✅
Aligns with Enterprise Architecture	✅
Reuses Existing Capabilities	✅
Secure Coding Standards Followed	✅
UI Standards Followed	✅
API Standards Followed	✅
Database Standards Followed	✅
.cursorrules Compliant	✅
Tests Implemented	✅
Business Documentation Added	✅
________________________________________

