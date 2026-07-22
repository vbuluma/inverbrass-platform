import { permissions } from "./permissions";

const allPermissionCodes = permissions.map((permission) => permission.code);

export const rolePermissionMatrix: Record<string, readonly string[]> = {
  BUSINESS_OWNER: allPermissionCodes,

  SUPERVISOR: [
    "TenantManagement.Business.Read",
    "TenantManagement.Branch.Read",
    "TenantManagement.Branch.Create",
    "TenantManagement.Branch.Update",
    "TenantManagement.Branch.Activate",
    "TenantManagement.Dashboard.Read",
    "ConfigurationManagement.IndustryTemplate.Read",
    "UserManagement.User.Read",
    "UserManagement.User.Create",
    "UserManagement.User.Update",
    "UserManagement.User.Activate",
    "UserManagement.User.Deactivate",
    "Authentication.UserCredential.Execute",
    "RolePermissionManagement.UserRole.Read",
    "RolePermissionManagement.UserRole.Assign",
    "RolePermissionManagement.Role.Read",
    "Authentication.SecurityProfile.Read",
    "ConfigurationManagement.BusinessConfiguration.Read",
    "ConfigurationManagement.FeatureToggle.Read",
    "AuditActivityLogging.AuditLog.Read",
  ],

  EMPLOYEE: [
    "TenantManagement.Business.Read",
    "TenantManagement.Branch.Read",
    "TenantManagement.Dashboard.Read",
  ],

  MAKER: [
    "TenantManagement.Business.Read",
    "TenantManagement.Dashboard.Read",
  ],

  CHECKER: [
    "TenantManagement.Business.Read",
    "AuditActivityLogging.AuditLog.Read",
  ],

  PLATFORM_ADMIN: [
    "TenantManagement.Business.Read",
    "ConfigurationManagement.IndustryTemplate.Read",
    "SubscriptionManagement.Subscription.Read",
    "RolePermissionManagement.Role.Read",
    "RolePermissionManagement.RolePermission.Read",
    "RolePermissionManagement.Permission.Read",
    "AuditActivityLogging.AuditLog.Read",
    "AuditActivityLogging.AuditLog.Export",
  ],
};
