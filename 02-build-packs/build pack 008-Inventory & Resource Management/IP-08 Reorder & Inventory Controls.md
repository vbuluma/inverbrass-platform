BP-008 IP-08 – Reorder & Inventory Controls
Attribute	Description
Implementation Package	IP-08
Build Pack	BP-008 – Inventory & Resource Management
Priority	High
Depends On	IP-01–IP-07, ENG-005, ENG-013
Scope coverage	Reorder controls, stock thresholds, inventory alerts and preventive controls
Related pack FRs	To be mapped in the BP-008 FR catalogue
1. Objective

Provide configurable inventory controls that help the business prevent stock-outs, excessive stock and avoidable inventory risk.

IP-08 monitors inventory conditions and raises actionable control signals.

IP-08 identifies what needs attention. It does not execute stock movement, purchasing, or reconciliation.

Inventory Position
       ↓
IP-08 Control Evaluation
       ↓
Threshold / Risk Detected
       ↓
Alert / Recommendation / Control
       ↓
Business Action
2. Business Problem

Without inventory controls, SMEs often discover problems too late:

stock has already run out;
fast-moving items are not reordered in time;
excess stock ties up cash;
products are approaching expiry;
stock falls below a safe level;
inventory remains reserved for too long;
damaged or quarantined stock is accidentally considered available.

The system needs to continuously derive the inventory position and expose conditions requiring business attention.

However, BP-008 should not automatically become a purchasing or supplier replenishment engine.

3. Scope
Included
A. Configurable inventory thresholds

Support configurable controls at the appropriate level:

Product
Product + location
Tenant/business default where applicable

Controls may include:

Control	Purpose
Reorder Point	Minimum level that triggers replenishment attention
Safety Stock	Quantity intended to remain as a buffer
Minimum Stock	Minimum acceptable stock level
Maximum Stock	Maximum preferred holding
Target Stock Level	Desired quantity after replenishment
Reorder Quantity	Suggested replenishment quantity
Expiry Warning Threshold	Days before expiry requiring attention
Reservation Age Threshold	Long-running reservations requiring review

Configuration must be data-driven.

Do not hard-code:

if quantity < 10 → reorder
B. Inventory status evaluation

IP-08 should derive inventory control conditions such as:

HEALTHY
LOW_STOCK
REORDER_REQUIRED
OUT_OF_STOCK
OVERSTOCKED
EXPIRING_SOON
EXPIRED_STOCK_PRESENT
RESERVATION_REVIEW_REQUIRED

These are control conditions, not replacements for the underlying stock or batch statuses.

For example:

Product: Cooking Oil
Available: 4
Reorder Point: 10
Safety Stock: 5

→ LOW_STOCK
→ REORDER_REQUIRED
4. Reorder Logic

The initial reorder calculation should be simple and configurable.

Example:

Available Stock = 20
Reorder Point = 30
Target Level = 100

Suggested Reorder = 80

Conceptually:

Suggested Reorder
=
Target Stock
− Available Inventory Position

The exact calculation must account only for inventory concepts explicitly available in BP-008 v1.

Important boundary

IP-08 may produce:

a reorder alert;
a suggested quantity;
a replenishment recommendation;
a draft replenishment request/handoff where architecture supports it.

IP-08 does not:

place supplier orders;
create supplier invoices;
execute payments;
perform procurement approval workflows.

Those belong to future procurement/supplier capabilities, particularly BP-009.

5. Available Inventory Position

IP-08 should consume the authoritative inventory position rather than maintain a competing stock balance.

Conceptually:

On Hand
− Reserved
− Unavailable / Quarantined
=
Available

The exact availability calculation should reuse IP-01/IP-03 inventory rules.

IP-08 must not create another independent stock balance.

6. Reorder Recommendations

A reorder recommendation should contain:

Product
Location
Current on-hand quantity
Available quantity
Reorder point
Target stock level
Suggested reorder quantity
Trigger reason
Priority/severity
Date/time generated
Current control status

Example:

Product: Item A
Location: Main Store

Available:       8
Reorder Point:   20
Target Level:    100

Suggested Order: 92

Status: REORDER_REQUIRED

A recommendation is not a purchase order.

7. Reorder Control Lifecycle

Suggested lifecycle:

NOT_TRIGGERED
      ↓
REORDER_REQUIRED
      ↓
ACKNOWLEDGED
      ↓
HANDOFF_READY
      ↓
RESOLVED

Alternative closure paths:

REORDER_REQUIRED
      ↓
DISMISSED

Dismissal should require a reason.

Examples:

seasonal product;
supplier discontinued;
temporary stock substitution;
business decision;
incorrect configuration.
8. Stock-Out Controls

The system should explicitly identify:

Available = 0

as:

OUT_OF_STOCK

Where stock becomes unavailable because it is:

fully reserved;
damaged;
lost;
quarantined;
expired;

the control view should explain the reason where possible.

Example:

On Hand:       100
Reserved:       70
Quarantined:   30

Available:       0

Status: OUT_OF_STOCK
Reason: All stock unavailable
9. Overstock Controls

Where configured:

Available > Maximum Stock

IP-08 should identify:

OVERSTOCKED

This is an operational warning.

IP-08 must not automatically adjust, write off or transfer the stock.

The business decides the action.

10. Expiry Controls

IP-08 consumes expiry information from IP-07.

It should provide control views such as:

Expiring soon
Expiring
Expired stock present
Quantity affected
Location
Batch

Example:

Batch B-1001
Expires: 10 days

Threshold: 30 days

→ EXPIRING_SOON
Boundary

IP-07 owns:

Batch, serial and expiry tracking.

IP-08 owns:

Inventory control signals and alerts based on that information.

11. Reservation Controls

IP-08 should identify inventory reservations requiring operational attention.

Examples:

reservation open beyond configured age;
reservation against cancelled/invalid sales state;
reservation where stock is no longer available for fulfilment;
unusually high proportion of stock reserved.

Example:

Product: Item A

On Hand: 100
Reserved: 90
Available: 10

Reservation Threshold: 24 hours

Reservation R-001:
Age: 3 days

→ RESERVATION_REVIEW_REQUIRED

IP-08 identifies the issue.

It does not silently release the reservation.

Release or correction must follow the appropriate inventory/sales control rules.

12. Alerts & Notifications

IP-08 should create inventory control notifications/events that can be consumed by the platform notification capability.

Potential channels:

In-app
Dashboard
Email
WhatsApp

The inventory module should request notification delivery through the shared platform capability.

It should not implement:

SMTP;
WhatsApp API;
its own notification infrastructure.

Notifications should be deduplicated to prevent alert storms.

Example:

Stock below reorder point
        ↓
Control event created
        ↓
Already active?
   ┌────┴────┐
  YES       NO
   ↓         ↓
No duplicate  Notify
13. Dashboard & Inventory Control Workspace

Provide an operational inventory control view.

Suggested sections:

Attention Required
Out of stock
Reorder required
Low stock
Expiring soon
Expired stock
Overstocked
Long-running reservations
Filters
Location
Product/category
Control status
Severity
Date
Stock condition
Product Detail

Show:

On Hand
Reserved
Available
Minimum
Reorder Point
Safety Stock
Maximum
Target Level
Control Status
Suggested Reorder

No BP/IP/ENG jargon should appear in customer-facing or operational screens.

14. Control Severity

Severity should be configurable or derived from the control condition.

Example:

Condition	Example Severity
Expired stock available for use	Critical
Out of stock	High
Below reorder point	Medium
Near expiry	Medium
Overstocked	Low
Reservation overdue	Medium

Avoid embedding arbitrary severity decisions throughout application code.

The rules should be centralised and configurable where business policy requires variation.

15. Maker-Checker

IP-08 itself should not require approval for simply detecting an inventory condition.

Maker-checker may apply to sensitive actions such as:

changing inventory control thresholds;
dismissing a critical alert;
overriding an expiry-related restriction;
manually resolving a critical inventory control;
changing reorder configuration;
releasing a protected control block.

The decision whether approval is required should come from the configurable inventory control policy.

Control Action
      ↓
Approval Required?
    ┌─────┴─────┐
   NO          YES
   ↓            ↓
Execute      ENG-005
                ↓
         Approve / Reject

Where segregation of duties applies:

The maker cannot approve their own action.

16. Control Configuration

The business should be able to configure, subject to appropriate permissions:

whether a control is enabled;
threshold values;
warning thresholds;
severity;
whether notifications are sent;
notification recipients/roles where supported;
whether an action requires approval;
location-specific overrides.

Configuration hierarchy should support:

Platform Default
       ↓
Business Default
       ↓
Product / Location Override

The most specific applicable configuration should win.

17. Idempotency & Recalculation

Repeated evaluation of the same inventory state must not create unlimited duplicate alerts.

Example:

Stock = 5
Reorder Point = 10

Evaluation 1 → REORDER_REQUIRED created
Evaluation 2 → Existing active control reused
Evaluation 3 → Existing active control reused

When the inventory position changes sufficiently:

Stock = 50
Reorder Point = 10

→ REORDER_REQUIRED resolved automatically

The control lifecycle changes, but the underlying stock movement remains owned by IP-01–IP-05.

18. Audit

Material actions must be audited through ENG-013.

Examples:

reorder control triggered;
threshold changed;
alert acknowledged;
alert dismissed;
control resolved;
expiry control raised;
notification requested;
override requested;
override approved/rejected;
reservation control raised.

Audit should capture:

business;
actor where applicable;
product;
location;
control;
previous state;
new state;
reason;
timestamp.
19. Tenant Isolation

All inventory controls must be scoped to the authenticated:

businessId

Cross-business access must fail closed.

A control generated for Business A must never appear in Business B's:

dashboard;
alerts;
product view;
API/service query;
reorder recommendations.
20. Acceptance Criteria
ID	Criterion
AC-001	Business can configure reorder, minimum, maximum, safety stock and target stock levels
AC-002	Configuration can be applied at product and location level where required
AC-003	Stock below the configured reorder point creates or activates a reorder control
AC-004	Reorder recommendation shows current inventory position and suggested quantity
AC-005	Suggested reorder is not automatically converted into a supplier purchase order
AC-006	Available inventory is derived from the authoritative inventory/reservation state and not duplicated
AC-007	Available stock of zero is identified as OUT_OF_STOCK
AC-008	Maximum stock controls can identify OVERSTOCKED inventory
AC-009	Expiry controls consume IP-07 expiry data without duplicating batch tracking
AC-010	Long-running reservations can generate review controls
AC-011	Repeated evaluation of the same condition does not create duplicate active controls
AC-012	A control can automatically resolve when its triggering condition no longer exists
AC-013	Dismissal or override requires a reason where configured
AC-014	Sensitive control actions use maker-checker where configured
AC-015	Maker cannot approve own action where SoD applies
AC-016	Inventory alerts can request delivery through the shared notification capability
AC-017	IP-08 does not implement SMTP, WhatsApp APIs or separate notification infrastructure
AC-018	Material control actions are audited through ENG-013
AC-019	Cross-business control access fails closed
AC-020	No control evaluation directly changes stock quantities, reservations, commercial totals or payment obligations
21. Explicit Non-Goals

Do not implement:

supplier purchase orders;
supplier invoices;
procurement workflows;
automatic purchasing;
automatic stock adjustments;
automatic stock transfers;
automatic reservation release without the owning process;
stocktake;
stock receiving;
inventory valuation/GL posting;
cashbook;
revenue assurance;
a separate notification engine;
a separate workflow engine;
supplier/AP management.
22. Architectural Boundary

The core boundary is:

IP-08 detects and controls inventory risk. It does not execute inventory or procurement transactions.

IP-01–IP-07
Inventory Events & State
        │
        ▼
 ┌──────────────────┐
 │      IP-08       │
 │ Inventory Control│
 └──────────────────┘
        │
        ├── Low stock
        ├── Reorder required
        ├── Out of stock
        ├── Overstock
        ├── Expiry risk
        └── Reservation review
        │
        ▼
 Alert / Recommendation / Handoff
        │
        ▼
 Business Action