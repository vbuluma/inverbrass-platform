export const permissionActionCodeByLabel = {
  Read: "VIEW",
  Create: "CREATE",
  Update: "UPDATE",
  Delete: "DELETE",
  Approve: "APPROVE",
  Reject: "REJECT",
  Assign: "ASSIGN",
  Import: "IMPORT",
  Export: "EXPORT",
  Execute: "EXECUTE",
  Configure: "CONFIGURE",
  Activate: "ACTIVATE",
  Deactivate: "DEACTIVATE",
} as const;

export type PermissionActionLabel = keyof typeof permissionActionCodeByLabel;

export function toPermissionActionCode(label: PermissionActionLabel): string {
  return permissionActionCodeByLabel[label];
}
