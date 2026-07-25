1. Business Requirements

Simple, business language.

BR ID	Business Requirement
BR-001	The platform shall guide new businesses through a step-by-step setup process.
BR-002	The setup process shall display overall progress.
BR-003	Businesses shall be able to skip optional configuration and complete it later.
BR-004	Country selection shall determine the default currency.
BR-005	Businesses shall support multiple operating currencies.
BR-006	Existing businesses shall see their business name after login instead of the generic welcome page.
BR-007	During onboarding the business status shall remain DRAFT until activation.
BR-008	Activation shall transition the business from DRAFT to ACTIVE when all mandatory steps are complete.
BR-009	Only ACTIVE businesses may access operational Build Packs.

2. Functional Requirements

Detailed enough for implementation.

FR ID	Functional Requirement
FR-001	Display Welcome screen for first-time business setup.
FR-002	Display setup progress indicator.
FR-003	Allow navigation back and forward.
FR-004	Save each completed step.
FR-005	Resume setup from last completed step.
FR-006	Selecting Country automatically loads default Currency.
FR-007	Allow adding additional currencies.
FR-008	Prevent duplicate currencies.
FR-009	Allow one currency to be marked as base currency.
FR-010	Existing / activated businesses display "Welcome to {Business Name}".
FR-011	Business Details shall capture remaining profile fields not collected at registration.
FR-012	Business Configuration shall capture minimum operating settings before activation.
FR-013	Activate Business shall set status ACTIVE and route to the named welcome then Dashboard.

3. Process Flow

Welcome
↓
Business Details
↓
Business Configuration
    ↓
    Country
    ↓
    Base Currency
    ↓
    Additional Currency (Optional)
    ↓
    Payment Methods
    ↓
    Receipt Configuration
    ↓
    AI Toggle (Optional)
    ↓
    Loyalty Toggle (Optional)
↓
Review
↓
Activate Business
↓
Welcome to {Business Name}
↓
Dashboard

No BPMN diagrams are needed for these small IPs.

4. Business Details Fields

Mandatory
• Trading Name (optional if same as Business Name — when blank, Business Name is used)
• Business Logo
• Business Email
• Physical Address
• County / State / Province
• City / Town

Optional
• Website
• Business Description
• GPS Location

No tax information on this step.

Registration already captures: Business Name, Business Type / Industry Template, Country, Owner Mobile, Owner Account.

5. Business Configuration Scope

Country
• Already selected during registration
• Displayed but editable

Currency
• Base Currency (mandatory)
• Additional Currencies (optional)
• Default currency automatically populated from Country
• User may change Base Currency
• Duplicate currencies not allowed

Payment Methods (enable/disable)
• Cash
• Mobile Money
• Bank Transfer
• Card
• Credit Sales

Receipt Configuration
• Receipt Prefix
• Receipt Footer
• Show Logo (Yes/No)

Feature Toggles
• AI Assistant (optional step)
• Loyalty Programme (optional step)

Tax (simple only)
• Enable Tax (Yes/No)
• Default Tax Rate

Detailed tax management belongs to the Tax capability later.
Nothing else is included in IP-006 configuration.

6. Mandatory vs Optional Steps

Step	Mandatory
Welcome	Yes
Business Details	Yes
Country	Yes
Base Currency	Yes
Additional Currency	No
Payment Methods	Yes
Receipt Configuration	Yes
AI Toggle	No
Loyalty Toggle	No
Review	Yes
Activate	Yes

7. Business Rules

Rule ID	Business Rule
BR-001	Country must be selected before Currency.
BR-002	Selecting Country automatically loads the default currency.
BR-003	Users may add multiple currencies.
BR-004	Exactly one Base Currency is mandatory.
BR-005	Duplicate currencies are not allowed.
BR-006	Setup progress is automatically saved after each completed step.
BR-007	Optional steps may be skipped.
BR-008	Setup cannot be activated until mandatory steps are complete.
BR-009	Returning users resume from the last incomplete step.
BR-010	After setup completion, users no longer see the onboarding welcome page.
BR-011	While setup is incomplete, Business Status = DRAFT.
BR-012	After Review and Activate, Business Status = ACTIVE.
BR-013	Only ACTIVE businesses may access operational Build Packs.

8. Activation Ownership

Activation is the final step of IP-006.
There is no separate Implementation Package solely to flip ACTIVE.
Activation sequence:

DRAFT
↓
All mandatory steps complete
↓
ACTIVE
↓
Welcome to {Business Name}
↓
Dashboard

---

## Implement IP-006A – Platform Initialization & Security Hardening

### Purpose
Stabilize BP-001 after smoke-test-1 gaps by completing platform reference-data initialization, hardening security-answer storage, validating lookup services, and adding startup readiness checks — without changing approved IP-006 business behaviour.

### Scope
1. **Reference data (idempotent seeds)**  
   Countries, Industries → Business Types, Currencies, Security Questions, Roles, Permissions, and Business Membership Statuses.
2. **Lookup services**  
   Registration, Login, Forgot Password, and Business Setup Wizard consume active catalogues. Empty catalogues return `[]`, log informatively, and surface a friendly UI message (no unhandled exceptions).
3. **Security hardening**  
   Security answers are hashed with the platform-approved algorithm (bcrypt, 12 rounds) before persistence. Verification compares hashes only. Show/Hide for answers remains UI-only.
4. **Startup validation**  
   On Node.js boot, validate Welcome message, Countries, Business Types, Currencies, and Security Questions. Development logs warnings; production logs errors; the application does not crash.
5. **Smoke coverage**  
   Extended IP-006A smoke verifies catalogue presence, lookup population, hashed answers, and seed idempotency.

### Out of scope
- Changes to IP-006 wizard step order, mandatory/optional classification, or activation rules (BR-001–BR-013 remain as approved).
- New recovery channels (email/SMS/OTP).
- Git operations as part of implementation delivery.

### Delivery notes
- Foundation migration `0005_ip006a_platform_foundation` restores missing `industry`, `business_type`, and `business` tables when absent and re-attaches dependent FKs.
- Seed entrypoint wires all required catalogues in dependency order.
- Instrumentation entrypoint runs non-fatal startup validation.
