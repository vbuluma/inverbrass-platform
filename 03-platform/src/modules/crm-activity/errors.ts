/**
 * Purpose:
 * Domain errors for BP-004 / IP-05 Activity & Task Management.
 */

export const CRM_ACTIVITY_USER_MESSAGES = {
  INVALID_INPUT: "Please check the activity details and try again.",
  NOT_FOUND: "Activity was not found or you do not have access.",
  PARTY_REQUIRED: "Select a customer or party for this activity.",
  ENTITY_LINK_REQUIRED: "Link at least one customer or CRM entity.",
  COMPLETED_READ_ONLY: "Completed activities cannot be edited except addendum notes.",
  OWNER_REQUIRED: "Assign an activity owner.",
  OUTCOME_REQUIRED: "Select an outcome when completing the activity.",
  SESSION_REQUIRED: "Your session has expired. Please sign in again.",
  INACTIVE_OWNER: "Cannot assign an inactive employee as activity owner.",
  COMPLETION_NOTES_REQUIRED: "Completion notes are required for this activity.",
  DUE_BEFORE_ACTIVITY: "Due date cannot precede the activity date.",
  INVALID_CATALOGUE_CODE: "Selected value is not in the activity catalogue.",
  BUSINESS_CONTEXT_REQUIRED: "Select a business before managing activities.",
} as const;

export class CrmActivityError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number = 400,
    readonly field?: string
  ) {
    super(message);
    this.name = "CrmActivityError";
  }
}
