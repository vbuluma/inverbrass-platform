import { permissions } from "./permissions";

const allPermissionCodes = permissions.map((permission) => permission.code);

export const rolePermissionMatrix: Record<string, readonly string[]> = {
  OWNER: allPermissionCodes,

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
    "CommercialManagement.Config.Read",
    "CommercialManagement.Config.Create",
    "CommercialManagement.Config.Update",
    "CommercialManagement.Config.Execute",
    "CommercialManagement.Override.Create",
    "CommercialManagement.TaxCompliance.Read",
    "CommercialManagement.TaxCompliance.Manage",
    "CommercialManagement.TaxCompliance.File",
    "CommercialManagement.TaxCompliance.Remit",
    "CommercialManagement.TaxCompliance.Evidence",
  ],

  CHECKER: [
    "TenantManagement.Business.Read",
    "AuditActivityLogging.AuditLog.Read",
    "CommercialManagement.Config.Read",
    "CommercialManagement.Config.Approve",
    "CommercialManagement.Config.Reject",
    "CommercialManagement.Config.Activate",
    "CommercialManagement.Config.Deactivate",
    "CommercialManagement.Override.Approve",
    "CommercialManagement.TaxCompliance.Read",
    "CommercialManagement.TaxCompliance.Evidence",
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
