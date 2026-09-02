import {
  type PermissionActionLabel,
  toPermissionActionCode,
} from "@/lib/permissions/permission-action-map";

export type PermissionSeed = {
  code: string;
  name: string;
  module: string;
  resource: string;
  action: PermissionActionLabel;
  description: string;
  displayOrder: number;
  isActive: boolean;
};

function permission(
  module: string,
  resource: string,
  action: PermissionActionLabel,
  description: string,
  displayOrder: number
): PermissionSeed {
  const code = `${module}.${resource}.${action}`;

  return {
    code,
    name: `${action} ${resource}`,
    module,
    resource,
    action,
    description,
    displayOrder,
    isActive: true,
  };
}

export const permissions: PermissionSeed[] = [
  // TenantManagement
  permission(
    "TenantManagement",
    "Business",
    "Read",
    "View business profile.",
    10
  ),
  permission(
    "TenantManagement",
    "Business",
    "Create",
    "Register new business during onboarding.",
    20
  ),
  permission(
    "TenantManagement",
    "Business",
    "Update",
    "Update business profile.",
    30
  ),
  permission(
    "TenantManagement",
    "Business",
    "Execute",
    "Activate business after successful validation.",
    40
  ),
  permission("TenantManagement", "Branch", "Read", "View branches.", 50),
  permission("TenantManagement", "Branch", "Create", "Create branch.", 60),
  permission("TenantManagement", "Branch", "Update", "Update branch.", 70),
  permission("TenantManagement", "Branch", "Delete", "Remove branch.", 80),
  permission("TenantManagement", "Branch", "Activate", "Enable branch.", 90),
  permission(
    "TenantManagement",
    "Branch",
    "Deactivate",
    "Disable branch.",
    100
  ),
  permission(
    "TenantManagement",
    "Dashboard",
    "Read",
    "Access onboarding and activation dashboard.",
    110
  ),

  // SubscriptionManagement
  permission(
    "SubscriptionManagement",
    "Subscription",
    "Read",
    "View subscription and enabled modules.",
    120
  ),

  // ConfigurationManagement
  permission(
    "ConfigurationManagement",
    "IndustryTemplate",
    "Read",
    "Browse industry templates.",
    130
  ),
  permission(
    "ConfigurationManagement",
    "BusinessConfiguration",
    "Read",
    "View business configuration.",
    140
  ),
  permission(
    "ConfigurationManagement",
    "BusinessConfiguration",
    "Update",
    "Save business configuration.",
    150
  ),
  permission(
    "ConfigurationManagement",
    "BusinessConfiguration",
    "Configure",
    "Access advanced configuration wizard.",
    160
  ),
  permission(
    "ConfigurationManagement",
    "FeatureToggle",
    "Read",
    "View enabled premium capabilities.",
    170
  ),
  permission(
    "ConfigurationManagement",
    "FeatureToggle",
    "Activate",
    "Enable optional platform capabilities.",
    180
  ),
  permission(
    "ConfigurationManagement",
    "FeatureToggle",
    "Deactivate",
    "Disable optional platform capabilities.",
    190
  ),

  // UserManagement
  permission(
    "UserManagement",
    "User",
    "Read",
    "View employees and memberships.",
    200
  ),
  permission("UserManagement", "User", "Create", "Create employee.", 210),
  permission("UserManagement", "User", "Update", "Update employee profile.", 220),
  permission("UserManagement", "User", "Activate", "Activate user account.", 230),
  permission(
    "UserManagement",
    "User",
    "Deactivate",
    "Deactivate user account.",
    240
  ),

  // RolePermissionManagement
  permission(
    "RolePermissionManagement",
    "UserRole",
    "Read",
    "View role assignments.",
    250
  ),
  permission(
    "RolePermissionManagement",
    "UserRole",
    "Assign",
    "Assign roles to users.",
    260
  ),
  permission(
    "RolePermissionManagement",
    "UserRole",
    "Update",
    "Modify role assignment details.",
    270
  ),
  permission(
    "RolePermissionManagement",
    "UserRole",
    "Delete",
    "End or revoke role assignment.",
    280
  ),
  permission(
    "RolePermissionManagement",
    "Role",
    "Read",
    "View available roles.",
    290
  ),
  permission(
    "RolePermissionManagement",
    "Role",
    "Create",
    "Create business role.",
    300
  ),
  permission(
    "RolePermissionManagement",
    "Role",
    "Update",
    "Update business role metadata.",
    310
  ),
  permission(
    "RolePermissionManagement",
    "Role",
    "Delete",
    "Delete or deactivate business role.",
    320
  ),
  permission(
    "RolePermissionManagement",
    "RolePermission",
    "Read",
    "View permissions assigned to a role.",
    330
  ),
  permission(
    "RolePermissionManagement",
    "RolePermission",
    "Assign",
    "Grant permission to business role.",
    340
  ),
  permission(
    "RolePermissionManagement",
    "RolePermission",
    "Delete",
    "Revoke permission from business role.",
    350
  ),
  permission(
    "RolePermissionManagement",
    "Permission",
    "Read",
    "Browse permission catalog.",
    360
  ),

  // Authentication
  permission(
    "Authentication",
    "SecurityProfile",
    "Read",
    "View security settings.",
    370
  ),
  permission(
    "Authentication",
    "SecurityProfile",
    "Configure",
    "Configure PIN policy, session timeout, and lockout.",
    380
  ),
  permission(
    "Authentication",
    "SecurityProfile",
    "Update",
    "Update security profile values.",
    390
  ),
  permission(
    "Authentication",
    "UserCredential",
    "Execute",
    "Reset employee PIN.",
    400
  ),

  // AuditActivityLogging
  permission(
    "AuditActivityLogging",
    "AuditLog",
    "Read",
    "View audit trail.",
    410
  ),
  permission(
    "AuditActivityLogging",
    "AuditLog",
    "Export",
    "Export audit records.",
    420
  ),

  // PartyManagement — Identity & Regulatory (IP-013)
  permission(
    "PartyManagement",
    "PartyIdentityIdentifier",
    "Read",
    "View unmasked regulatory identifier values (full value access).",
    430
  ),

  // CommercialManagement — BP-005 / IP-08 Commercial Governance
  permission(
    "CommercialManagement",
    "Config",
    "Read",
    "View commercial governance configurations.",
    500
  ),
  permission(
    "CommercialManagement",
    "Config",
    "Create",
    "Create commercial configuration drafts.",
    510
  ),
  permission(
    "CommercialManagement",
    "Config",
    "Update",
    "Edit commercial configuration drafts and governance policy.",
    520
  ),
  permission(
    "CommercialManagement",
    "Config",
    "Execute",
    "Submit commercial configuration for approval.",
    530
  ),
  permission(
    "CommercialManagement",
    "Config",
    "Approve",
    "Approve commercial configuration changes.",
    540
  ),
  permission(
    "CommercialManagement",
    "Config",
    "Reject",
    "Reject commercial configuration changes.",
    550
  ),
  permission(
    "CommercialManagement",
    "Config",
    "Activate",
    "Activate approved commercial configurations.",
    560
  ),
  permission(
    "CommercialManagement",
    "Config",
    "Deactivate",
    "Suspend active commercial configurations.",
    570
  ),
  permission(
    "CommercialManagement",
    "Override",
    "Create",
    "Request a controlled commercial override.",
    580
  ),
  permission(
    "CommercialManagement",
    "Override",
    "Approve",
    "Approve or reject commercial override requests.",
    590
  ),

  // CommercialManagement — BP-005 / IP-11 Tax Compliance
  permission(
    "CommercialManagement",
    "TaxCompliance",
    "Read",
    "View tax compliance profiles, obligations, calendars and evidence metadata.",
    600
  ),
  permission(
    "CommercialManagement",
    "TaxCompliance",
    "Manage",
    "Manage tax compliance profiles, registrations, calendars and obligations.",
    610
  ),
  permission(
    "CommercialManagement",
    "TaxCompliance",
    "File",
    "Prepare and submit tax filings (compliance recording — not authority integration).",
    620
  ),
  permission(
    "CommercialManagement",
    "TaxCompliance",
    "Remit",
    "Record tax remittance outcomes (payment execution is BP-007).",
    630
  ),
  permission(
    "CommercialManagement",
    "TaxCompliance",
    "Evidence",
    "Upload and verify tax compliance evidence document references.",
    640
  ),
  permission("Procurement", "Supplier", "Read", "View procurement suppliers.", 650),
  permission(
    "Procurement",
    "Supplier",
    "Create",
    "Register a procurement profile on an existing party.",
    660
  ),
  permission(
    "Procurement",
    "Supplier",
    "Update",
    "Update procurement profile categories, capabilities, and terms.",
    670
  ),
  permission(
    "Procurement",
    "Qualification",
    "Manage",
    "Record and update supplier qualification.",
    680
  ),
  permission(
    "Procurement",
    "Status",
    "Manage",
    "Change procurement status including suspend and deactivate.",
    690
  ),
  permission(
    "Procurement",
    "Preferred",
    "Manage",
    "Set or clear preferred supplier status.",
    700
  ),
  permission(
    "Procurement",
    "Blacklist",
    "Manage",
    "Blacklist or lift a supplier blacklist.",
    710
  ),
  permission("Procurement", "Request", "Read", "View purchase requests.", 720),
  permission(
    "Procurement",
    "Request",
    "Create",
    "Create purchase requests.",
    730
  ),
  permission(
    "Procurement",
    "Request",
    "Update",
    "Update draft or returned purchase requests.",
    740
  ),
  permission(
    "Procurement",
    "Request",
    "Execute",
    "Submit purchase requests for approval.",
    750
  ),
  permission(
    "Procurement",
    "Request",
    "Approve",
    "Approve, reject, or return purchase requests.",
    760
  ),
  permission(
    "Procurement",
    "Request",
    "Deactivate",
    "Cancel purchase requests before sourcing.",
    770
  ),
  permission("Procurement", "Sourcing", "Read", "View RFX, evaluations, and awards.", 780),
  permission(
    "Procurement",
    "Sourcing",
    "Create",
    "Create sourcing events and invite suppliers.",
    790
  ),
  permission(
    "Procurement",
    "Sourcing",
    "Update",
    "Update sourcing recommendations and record quotes.",
    800
  ),
  permission(
    "Procurement",
    "Sourcing",
    "Approve",
    "Finalize evaluation and award suppliers.",
    810
  ),
  permission("Procurement", "PurchaseOrder", "Read", "View purchase orders.", 820),
  permission("Procurement", "PurchaseOrder", "Create", "Create purchase orders.", 830),
  permission("Procurement", "PurchaseOrder", "Update", "Update draft purchase orders.", 840),
  permission(
    "Procurement",
    "PurchaseOrder",
    "Execute",
    "Submit purchase orders for approval.",
    850
  ),
  permission(
    "Procurement",
    "PurchaseOrder",
    "Approve",
    "Approve or reject purchase orders.",
    860
  ),
  permission("Procurement", "PurchaseOrder", "Issue", "Issue approved purchase orders.", 870),
  permission("Procurement", "PurchaseOrder", "Amend", "Amend issued purchase orders.", 880),
  permission(
    "Procurement",
    "PurchaseOrder",
    "Deactivate",
    "Cancel purchase orders.",
    890
  ),
  permission("Procurement", "PurchaseOrder", "Close", "Close fulfilled purchase orders.", 900),
  permission("Procurement", "Contract", "Read", "View procurement contracts.", 910),
  permission("Procurement", "Contract", "Create", "Create procurement contracts.", 920),
  permission("Procurement", "Contract", "Update", "Update draft contracts.", 930),
  permission(
    "Procurement",
    "Contract",
    "Execute",
    "Submit contracts for approval.",
    940
  ),
  permission(
    "Procurement",
    "Contract",
    "Approve",
    "Approve or reject contracts.",
    950
  ),
  permission("Procurement", "Contract", "Activate", "Activate executed contracts.", 960),
  permission("Procurement", "Contract", "Amend", "Amend active contracts.", 970),
  permission("Procurement", "Contract", "CallOff", "Create contract call-off orders.", 980),
  permission(
    "Procurement",
    "Contract",
    "Deactivate",
    "Suspend or terminate contracts.",
    990
  ),
  permission("Procurement", "Contract", "Close", "Close completed contracts.", 1000),
  permission("Procurement", "Receiving", "Read", "View procurement receipts.", 1010),
  permission("Procurement", "Receiving", "Create", "Create procurement receipts.", 1020),
  permission("Procurement", "Receiving", "Confirm", "Confirm procurement receipts.", 1030),
  permission("Procurement", "Receiving", "Reject", "Reject procurement receipts.", 1040),
  permission("Procurement", "Receiving", "Inspect", "Record receipt inspection outcomes.", 1050),
  permission("Procurement", "Receiving", "Discrepancy", "Record receipt discrepancies.", 1060),
  permission("Procurement", "Invoice", "Read", "View supplier invoices.", 1070),
  permission("Procurement", "Invoice", "Create", "Capture supplier invoices.", 1080),
  permission("Procurement", "Invoice", "Update", "Update draft supplier invoices.", 1090),
  permission("Procurement", "Invoice", "Execute", "Submit supplier invoices for matching.", 1100),
  permission("Procurement", "Invoice", "Match", "Run invoice matching.", 1110),
  permission("Procurement", "Invoice", "Approve", "Approve matched supplier invoices.", 1120),
  permission("Procurement", "Invoice", "Reject", "Reject supplier invoices.", 1130),
  permission("Procurement", "Exception", "Read", "View procurement exceptions.", 1140),
  permission("Procurement", "Exception", "Create", "Raise procurement exceptions.", 1150),
  permission("Procurement", "Exception", "Assign", "Assign procurement exception owners.", 1160),
  permission("Procurement", "Exception", "Resolve", "Resolve procurement exceptions.", 1170),
  permission("Procurement", "Exception", "Approve", "Approve procurement exception closures.", 1180),
  permission("Procurement", "Exception", "Close", "Close procurement exceptions.", 1190),
  permission("Procurement", "Exception", "Deactivate", "Cancel procurement exceptions.", 1200),
  permission("Procurement", "Performance", "Read", "View supplier performance scorecards.", 1210),
  permission("Procurement", "Performance", "Manage", "Refresh supplier performance scorecards.", 1220),
  permission("Procurement", "Governance", "Propose", "Propose supplier governance changes.", 1230),
  permission("Procurement", "Governance", "Approve", "Approve supplier governance changes.", 1240),
  permission("Procurement", "Analytics", "Read", "View procurement analytics and lifecycle intelligence.", 1250),
];

export function getPermissionActionCode(seed: PermissionSeed): string {
  return toPermissionActionCode(seed.action);
}
