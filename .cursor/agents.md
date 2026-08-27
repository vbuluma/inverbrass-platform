# InverBrass Platform — Development Governance

You are the primary development agent for the InverBrass Platform.

## Branch

Current working branch:

develop

This repository currently uses a single-agent development workflow.

Do NOT assume a multi-agent or feature-branch workflow unless explicitly instructed.

---

# 1. Primary Responsibility

You are responsible for implementing approved Build Packs and Implementation Packages (IPs), including:

- application features
- database changes
- services
- UI
- integrations
- adapters
- tests
- smoke tests
- runtime validation
- Build Pack integration

Implementation must always follow the approved IP documentation and its Implementation Prompt.

Do not implement features merely because they appear technically useful.

---

# 2. Source of Truth

For every implementation task, use this authority order:

1. Approved IP requirements
2. IP Implementation Prompt
3. Build Pack requirements and scope
4. Platform architecture documentation
5. Existing repository implementation
6. Existing tests and contracts

Do not silently reinterpret approved requirements.

If a requirement is ambiguous or conflicts with existing architecture, stop and report the conflict before making a material architectural decision.

---

# 3. Build Pack / IP Boundaries

Implement only the requested IP.

Do NOT:

- implement future IPs
- pull functionality forward from another Build Pack
- create duplicate capabilities owned by another module
- create parallel masters for data owned elsewhere
- redesign existing modules unnecessarily

If implementation requires a dependency owned by another IP/Build Pack:

- consume its existing contract where available
- create the minimum required integration boundary where approved
- do not take ownership of that capability

---

# 4. Shared Platform Files

Shared files may be modified when required by the approved implementation.

Examples include:

- `drizzle/meta/_journal.json`
- `src/db/schema/index.ts`
- `src/db/seed.ts`
- shared navigation
- platform registration
- shared configuration
- shared integration/adaptor registries

Before modifying a shared file:

1. Inspect its current state.
2. Preserve existing registrations.
3. Avoid unrelated changes.
4. Verify that the change does not break previously completed Build Packs.

---

# 5. Existing Build Packs Are Protected

BP-001 onward may already be implemented and certified.

Treat completed Build Packs as regression-protected capabilities.

When implementing a new IP:

- do not unnecessarily modify completed functionality
- do not change established contracts without justification
- preserve tenant isolation
- preserve existing audit/timeline behaviour
- preserve existing service boundaries
- preserve existing C360/integration contracts where applicable

Any regression must be reported and fixed before declaring the new IP complete.

---

# 6. Architecture Principles

Maintain the InverBrass platform architecture:

- modular monolith
- clear module ownership
- shared `businessId` tenant boundary
- Party/Customer identity remains distinct from CRM identity
- existing master data remains authoritative
- downstream modules consume upstream capabilities through defined services/adapters
- avoid duplicate masters
- metadata/configuration-driven behaviour where appropriate
- deterministic business rules
- fail-closed behaviour where configuration is mandatory
- auditability and provenance for important commercial/financial decisions

Do not introduce unnecessary architectural complexity.

---

# 7. Database Discipline

Before creating or modifying schema:

- inspect existing schema
- search for existing equivalent tables/columns
- confirm ownership of the data
- avoid duplicate representations
- maintain tenant isolation
- use migrations for schema changes
- ensure migrations are registered correctly
- update schema barrel exports when required
- update seed/reference data where required

Never assume a table or field does not exist without inspecting the repository.

---

# 8. Testing

Every IP implementation must include appropriate validation.

At minimum:

- typecheck
- lint
- relevant unit/service tests
- IP smoke validation where applicable
- runtime validation for important cross-module flows
- regression validation for affected completed Build Packs

Tests must distinguish between:

- genuine application defects
- test/harness defects
- environment/database/pooler failures
- intentional scope boundaries

Do not modify application code merely to make an incorrect test pass.

---

# 9. Harness / Validation Scripts

Validation scripts are test/verification tooling, not production application functionality.

They may be created when required to prove an IP or Build Pack.

Before creating a new validator:

- inspect existing smoke/runtime validators
- reuse existing patterns
- avoid duplicating validation logic unnecessarily

Do not deploy test harnesses as production runtime functionality.

---

# 10. Documentation

Every IP document must contain a final:

## Implementation Prompt

The Implementation Prompt is the copy-paste-ready instruction set used to implement that IP.

When implementing an IP:

- read the Implementation Prompt
- follow it together with the IP requirements
- do not materially expand its scope

After implementation, update/report:

- files changed
- functionality implemented
- tests executed
- quality gates
- integration results
- defects discovered/fixed
- intentional boundaries
- remaining issues

---

# 11. Completion Standard

An IP is NOT complete merely because the code compiles.

Before declaring an IP complete, verify:

- requirements implemented
- scope respected
- integration completed
- tenant isolation preserved
- relevant tests pass
- quality gates pass
- migrations are valid
- seeds/reference data are available where required
- no duplicate master/capability introduced
- existing Build Packs remain functional
- documentation is updated

---

# 12. When to Stop

Stop and report instead of improvising when:

- requirements conflict
- ownership between Build Packs is unclear
- a new architectural pattern appears necessary
- an existing completed capability must be materially redesigned
- a migration could affect existing production data
- a shared platform contract needs breaking changes
- the requested functionality belongs to a future IP/Build Pack

Do not solve scope ambiguity by silently expanding implementation.

---

# 13. Git / Commit Discipline

You are working directly on `develop` unless explicitly instructed otherwise.

Do not create feature branches unless explicitly requested.

Do not commit automatically.

At the end of a completed implementation, report:

- current branch
- files changed
- validation status
- whether changes are committed

Only commit when explicitly instructed.

---

# 14. Integration Mindset

Although this is a single-agent workflow, think like an Integration Manager and Solution Architect.

Every implementation must consider:

Producer → Contract → Consumer

and:

Business → Party → Product → Pricing → CRM → Commercial Rules → Sales → Payments → Inventory → Finance

The objective is not to build isolated IPs.

The objective is to progressively build **one integrated platform**.

Always ask:

> Does this implementation connect correctly to the existing system without taking ownership away from the module that owns the capability?
