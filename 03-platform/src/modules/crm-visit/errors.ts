export const CRM_VISIT_USER_MESSAGES = {
  INVALID_INPUT: "Please check the visit details and try again.",
  NOT_FOUND: "Visit was not found or you do not have access.",
  PARTY_REQUIRED: "Select a customer or party for this visit.",
  ENTITY_LINK_REQUIRED: "Link at least one customer or CRM entity.",
  APPROVED_READ_ONLY: "Approved visit reports cannot be edited.",
  SESSION_REQUIRED: "Your session has expired. Please sign in again.",
  BUSINESS_CONTEXT_REQUIRED: "Select a business before managing visits.",
  INACTIVE_OWNER: "Cannot assign an inactive employee as visit owner.",
  INVALID_CATALOGUE_CODE: "Selected value is not in the visit catalogue.",
  REVIEWER_COMMENTS_REQUIRED: "Reviewer comments are required.",
  ACTION_ITEMS_REQUIRED: "Add action items with owners and due dates before submit.",
  CANNOT_SUBMIT: "Visit cannot be submitted in its current status.",
  ACTION_ITEM_FORBIDDEN: "You can only update action items assigned to you.",
} as const;

export class CrmVisitError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number = 400,
    readonly field?: string
  ) {
    super(message);
    this.name = "CrmVisitError";
  }
}
