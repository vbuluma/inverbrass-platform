export const CRM_CASE_USER_MESSAGES = {
  INVALID_INPUT: "Please check the case details and try again.",
  NOT_FOUND: "Case was not found or you do not have access.",
  PARTY_REQUIRED: "Select a customer or party for this case.",
  SESSION_REQUIRED: "Your session has expired. Please sign in again.",
  BUSINESS_CONTEXT_REQUIRED: "Select a business before managing cases.",
  INACTIVE_OWNER: "Cannot assign an inactive employee as owner.",
  INVALID_CATALOGUE_CODE: "Selected value is not in the case catalogue.",
  OWNER_REQUIRED: "This severity requires an owner to be assigned immediately.",
  INVALID_TRANSITION: "That status change is not allowed for this case.",
  NOT_EDITABLE: "Closed cases cannot be edited. Use reopen if permitted.",
  RESOLUTION_REQUIRED: "Provide a resolution summary and resolution code.",
  CLOSE_FROM_RESOLVED: "Cases can only be closed after they are resolved.",
  REOPEN_REASON_REQUIRED: "Provide a reason to reopen a closed case.",
  ALREADY_ESCALATED: "Case is already escalated.",
} as const;

export class CrmCaseError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number = 400,
    readonly field?: string
  ) {
    super(message);
    this.name = "CrmCaseError";
  }
}
