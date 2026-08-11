export const CRM_GOVERNANCE_USER_MESSAGES = {
  INVALID_INPUT: "Please check the governance details and try again.",
  NOT_FOUND: "Governance record was not found or you do not have access.",
  PARTY_NOT_FOUND: "Party was not found or you do not have access.",
  SESSION_REQUIRED: "Your session has expired. Please sign in again.",
  BUSINESS_CONTEXT_REQUIRED: "Select a business before managing CRM governance.",
  GOVERNANCE_LOCKED: "Governance is locked pending approval and cannot be edited.",
  GOVERNANCE_IMMUTABLE: "Archived governance cannot change ownership.",
  OWNER_REQUIRED: "Assign an active owner before activation.",
  MERGE_NOT_FOUND: "Merge proposal was not found.",
  MERGE_INVALID_STATUS: "That merge action is not allowed for the current status.",
  USER_NOT_ASSIGNABLE: "Selected user is not an active employee of this business.",
  SLA_INVALID: "SLA policy details are invalid.",
} as const;

export class CrmGovernanceError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number = 400,
    readonly field?: string
  ) {
    super(message);
    this.name = "CrmGovernanceError";
  }
}
