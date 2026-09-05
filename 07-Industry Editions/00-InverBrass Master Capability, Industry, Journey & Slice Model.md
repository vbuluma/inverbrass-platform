
The platform objective is broader:

> **InverBrass is a configurable, mobile-first business operating platform that provides shared business capabilities across multiple industries, with Industry Editions/templates tailoring those capabilities to specific business types.**

So **channels are only one dimension** of the model.

## Where Industry Editions come in

I would structure the overall model like this:

```text
                    INVERBRASS PLATFORM
                           │
                ┌──────────┴──────────┐
                │                     │
          SHARED PLATFORM        CONFIGURATION
          CAPABILITIES             & EDITIONS
                │                     │
     ┌──────────┼──────────┐          │
     │          │          │          │
 Business     Staff      Customer     │
 Capabilities Capabilities Capabilities
     │          │          │          │
     └──────────┼──────────┘          │
                │                     │
                ▼                     ▼
          SHARED DOMAINS       INDUSTRY EDITIONS
          / BUILD PACKS              │
                │             ┌──────┼────────┐
                │             │      │        │
                │           SME   Education  NGO
                │             │      │        │
                │           Retail Chama   Property
                │           Health Agriculture Banking
                │           Hospitality Government
                │
                ▼
             CHANNELS
                │
      ┌─────────┼──────────┐
      Web       PWA      WhatsApp
      │          │          │
      └──────────┼──────────┘
                 ▼
             CUSTOMER
```

So the **Industry Edition is not something we bolt on after channels**.

It needs to be represented in the capability model **now**.

---

# The four things we need to separate

This is the key architectural distinction I would freeze.

### 1. Capability

**What InverBrass can do.**

Example:

> Manage Students

> Manage Inventory

> Collect Fees

> Manage Customers

> Manage Suppliers

> Manage Programmes

> Manage Classes

> Manage Bookings

---

### 2. Journey

**What an actor is trying to accomplish.**

Example:

> School staff enrol a student.

> Parent pays school fees.

> Retail customer buys goods.

> NGO creates a programme.

> Chama member contributes money.

---

### 3. Industry Edition

**Which capabilities, configurations, workflows and journeys are appropriate for a particular industry/business type.**

For example:

### Education Edition

Could activate:

```text
Student Management
Guardian Management
Classes
Academic Terms
Fee Structures
Fee Collection
Attendance
Results
School Communications
```

while reusing shared platform capabilities:

```text
Party
Payments
Receipts
Expenses
Staff
Documents
Notifications
Workflow
Reporting
```

---

### 4. Channel

**How the actor accesses the capability.**

For example:

```text
School parent
     ↓
WhatsApp
     ↓
View Fees
     ↓
Pay Fees
```

or:

```text
Retail customer
     ↓
Web
     ↓
Browse Product
     ↓
Purchase
     ↓
Pay
```

The **capability doesn't become a WhatsApp capability or Web capability**.

The channel simply exposes it.

---

# Therefore our master model should actually be

I would revise the framework we just created to:

```text
ACTOR
   ↓
INDUSTRY / BUSINESS TYPE
   ↓
EDITION / TEMPLATE
   ↓
BUSINESS CAPABILITY
   ↓
JOURNEY
   ↓
CAPABILITY
   ↓
SLICE
   ↓
CHANNEL
   ↓
DOMAIN / BUILD PACK
   ↓
ENGINE
   ↓
DATA
```

But there is an important nuance:

**Channel should not necessarily come after Slice conceptually.**

A better model is:

```text
                    BUSINESS CONTEXT
                 Industry / Edition / Template
                           │
                           ▼
                         ACTOR
                           │
                           ▼
                        JOURNEY
                           │
                           ▼
                      CAPABILITIES
                           │
                           ▼
                         SLICE
                    /      |       \
                 Web      PWA     WhatsApp
                    \      |       /
                         ENG-003o
                           │
                           ▼
                    Domain / Build Pack
```

The same journey/slice can potentially be implemented across multiple channels.

---

# This also explains the purpose of the platform

The **shared operational platform BP-001–009** is the foundation.

We don't want to build:

> "An SME ERP"

and then separately build:

> "A school ERP"

and separately:

> "An NGO ERP."

That would destroy the advantage of InverBrass.

Instead:

```text
              SHARED INVERBRASS PLATFORM
                       │
       ┌───────────────┼────────────────┐
       │               │                │
     Party          Payments         Workflow
     Sales          Inventory        Documents
     Procurement    Expenses         Notifications
     CRM            etc.
       │
       └───────────────┬────────────────┘
                       │
                INDUSTRY EDITIONS
                       │
       ┌───────────────┼────────────────┐
       │               │                │
   Education          NGO             Chama
       │               │                │
   Education       Programme          Member
   specific       Management         Finance
   capabilities   etc.               etc.
```

That's much more powerful.

---

# And your industry list belongs in the Capability/Edition model

Based on the platform blueprint you have established, we should capture the maturity explicitly rather than pretending everything is equally implemented.

| Industry / Segment         | Platform Position                                  |
| -------------------------- | -------------------------------------------------- |
| SMEs                       | **Primary audience** — core configurable mini-ERP  |
| Education                  | Education Edition / School Industry Solution       |
| NGOs                       | NGO Edition / programme tooling planned            |
| Chamas / Community Finance | Explicit Chama template/domain                     |
| Retail                     | Industry/template                                  |
| Hospitality                | Industry/template                                  |
| Healthcare                 | Industry/template                                  |
| Property                   | Seeded industry                                    |
| Agriculture                | Edition-level vision                               |
| Banking                    | Edition-level vision                               |
| Government                 | Industry listed; dedicated edition not yet defined |

And this distinction is important:

### "Supported" ≠ "Fully implemented"

We should have maturity statuses such as:

```text
FOUNDATION
SEEDED
CONFIGURABLE
EDITION DEFINED
PARTIALLY IMPLEMENTED
IMPLEMENTED
CERTIFIED
VISION / ROADMAP
```

That prevents our master catalogue from claiming that, for example, the full NGO or Banking solution already exists merely because the industry is in the blueprint.

---

# So I would change our next step

I **would not immediately create the Customer Capability Catalogue I proposed earlier.**

That would lock us into a customer-channel perspective too early.

Instead, the next document should be the **master InverBrass Capability & Experience Model**.

It should contain:

### A. Platform Capability Catalogue

What the shared platform provides.

### B. Actor Capability Catalogue

What each actor can do:

* Platform Admin
* Business Owner/Admin
* Staff
* Customer
* potentially Partner/API actors

### C. Industry Catalogue

All supported/target industries and business types.

### D. Industry Edition Catalogue

Which capabilities are activated/configured by each Edition.

### E. Journey Catalogue

Business, staff and customer journeys.

### F. Channel Catalogue

Web, PWA, Mobile, WhatsApp, API, etc.

### G. Capability–Industry Matrix

Which industries use which capabilities.

### H. Capability–Actor Matrix

Who can perform each capability.

### I. Capability–Channel Matrix

Where each capability can be accessed.

### J. Journey–Capability Matrix

### K. Journey–Slice Matrix

### L. Slice Register

### M. Build Pack / Engine Traceability

---

# Then the full governance picture becomes

```text
                    INVERBRASS
                        │
              ┌─────────┴─────────┐
              │                   │
        PLATFORM FOUNDATION   INDUSTRY MODEL
              │                   │
         BP-001–009         Industries / Types
              │                   │
              └─────────┬─────────┘
                        │
                  CAPABILITY
                     MODEL
                        │
          ┌─────────────┼─────────────┐
          │             │             │
        ACTOR        JOURNEY       EDITION
          │             │             │
          └─────────────┼─────────────┘
                        │
                      SLICE
                        │
                    CHANNEL
                        │
                  ENG-003o
                        │
                DOMAIN / BUILD PACK
                        │
                    ENGINES
```

## And this answers your question: "When does this come up?"

**Now — before we finalize the channel capability catalogue.**

The document we just created, **Channel & Capability Implementation Scope**, remains valid, but it should be treated as the **channel implementation standard**, not the master definition of the entire platform capability model.

The next authoritative document should therefore be:

> **`InverBrass Master Capability, Industry, Journey & Slice Model`**

That becomes the **parent reference**.

Then:

> `Channel & Capability Implementation Scope`

becomes the **channel-specific child standard**.

Then individual documents:

```text
Master Capability Model
        │
        ├── Channel Implementation Scope
        │       ├── Web
        │       ├── PWA
        │       ├── WhatsApp
        │       └── API
        │
        ├── Industry Editions
        │       ├── Education
        │       ├── NGO
        │       ├── Chama
        │       └── Retail...
        │
        └── Slice Specifications
                ├── SL-CUS-001
                ├── SL-CUS-002
                └── ...
```
