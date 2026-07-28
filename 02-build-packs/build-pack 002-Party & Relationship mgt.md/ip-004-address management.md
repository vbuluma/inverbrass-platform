
BP-002 – IP-004: Address Management

Implement IP-004 – Address Management only.

Follow the established InverBrass architecture:

UI → Server Actions → Services → Repositories → Drizzle → PostgreSQL

Do not modify existing Party, Roles, or Contacts functionality except where necessary to integrate Addresses into the existing Party Workspace.

Scope

Implement reusable enterprise Address Management for all Parties (Individuals and Organizations).

Deliver:

Address Type catalogue
Party Addresses
Default Address
Address Status
Address CRUD
Addresses tab in Party Workspace

Do NOT implement:

GPS maps
Geocoding
Google Maps integration
Delivery routing
Distance calculations
Address verification APIs
AI location services

These belong to later Implementation Packages.

Database

Create:

address_type
party_address

party_address shall include:

Party ID
Address Type
Country
State / Province
County / District
City / Town
Ward / Locality
Postal Code
Address Line 1
Address Line 2
Landmark
GPS Latitude (optional)
GPS Longitude (optional)
Is Default
Status
Notes
Enterprise Base Entity fields
Tenant isolation
Soft delete
Audit fields

Seed configurable Address Types.

Address Types

Seed as configurable reference data:

Physical
Postal
Billing
Delivery
Head Office
Branch
Residential
Office
GPS

Future address types shall come from the Configuration Engine.

Business Rules

Implement:

A Party may have multiple Addresses.
Only one Default Address per Address Type.
Multiple Default Addresses across different Address Types are allowed.
Default Addresses cannot be inactive.
Organizations may have multiple Office/Branch addresses.
Individuals normally have Residential plus optional Postal.
Soft delete only.
Country is mandatory.
Address validation uses the selected Country.
GPS coordinates are optional.

Business rules belong only in Services.

Party Workspace

Enable the Addresses tab.

Display:

Address Type
Country
City
County / State
Default
Status

Actions:

Add Address
Edit Address
Set Default
Deactivate
Reactivate
Remove

Reuse the existing Party Workspace.

No duplicate UI.

Party Registration

Keep registration lightweight.

Individual:

No address required during registration.

Organization:

No address required during registration.

Addresses are maintained from the Party Workspace.

Validation

Validate:

Country required
Address Type required
City optional
County/State optional
GPS optional

No Google Maps integration.

Enterprise Standards

Reuse existing Enterprise Standards where applicable.

Addresses shall be country-aware and support future Localization & Regulatory Engine enhancements.

Do not hardcode Kenya-specific administrative levels.

Architecture Rules

Maintain strict separation:

UI Components
Server Actions
Services
Repositories

Repositories perform persistence only.

Services enforce business rules.

No business logic inside UI or Repositories.

Quality Gates

Before stopping:

Smoke tests
Typecheck
ESLint
Production build

All must pass.

Stop Point

Complete only IP-004 – Address Management.

Do not begin IP-005 (Relationships).

Return:

Files Created
Files Modified
Database entities
Architecture compliance
Smoke results
Typecheck
ESLint
Production build
Remaining manual verification

Stop after IP-004 and await approval before proceeding to IP-005.

One recommendation before implementation

Since you've already introduced EDS-003 (Phone Numbers), this is a good opportunity to introduce another enterprise standard:

EDS-009 – Address Standardization

Rather than hardcoding fields like "County" or "State", define a configurable administrative hierarchy driven by country. For example:

Kenya: Country → County → Sub-County → Ward
Uganda: Country → District → County → Sub-County
Tanzania: Country → Region → District → Ward
USA: Country → State → County → City

The Address Management UI can still present the same form, but the labels and hierarchy come from the Localization & Regulatory Engine (ENG-003b). This keeps the platform truly multi-country without redesigning the address model later.