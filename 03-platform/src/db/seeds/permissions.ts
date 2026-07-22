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
];

export function getPermissionActionCode(seed: PermissionSeed): string {
  return toPermissionActionCode(seed.action);
}
