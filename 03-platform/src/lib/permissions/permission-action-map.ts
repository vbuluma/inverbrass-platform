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
  Manage: "MANAGE",
  File: "FILE",
  Remit: "REMIT",
  Evidence: "EVIDENCE",
  Issue: "ISSUE",
  Amend: "AMEND",
  Close: "CLOSE",
  CallOff: "CALLOFF",
  Confirm: "CONFIRM",
  Inspect: "INSPECT",
  Discrepancy: "DISCREPANCY",
  Match: "MATCH",
  Resolve: "RESOLVE",
  Propose: "PROPOSE",
} as const;

export type PermissionActionLabel = keyof typeof permissionActionCodeByLabel;

export function toPermissionActionCode(label: PermissionActionLabel): string {
  return permissionActionCodeByLabel[label];
}
