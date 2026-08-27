export const CRM_COMMUNICATION_USER_MESSAGES = {
  INVALID_INPUT: "Please check the communication details and try again.",
  NOT_FOUND: "Communication was not found or you do not have access.",
  PARTY_REQUIRED: "Select a customer or party for this communication.",
  SESSION_REQUIRED: "Your session has expired. Please sign in again.",
  BUSINESS_CONTEXT_REQUIRED: "Select a business before managing communications.",
  INACTIVE_OWNER: "Cannot assign an inactive employee as owner.",
  INVALID_CATALOGUE_CODE: "Selected channel is not in the communication catalogue.",
  CONSENT_BLOCKED: "Outbound communication blocked — party has not consented to this channel.",
  CONTACT_CHANNEL_REQUIRED: "Provide a contact channel value for outbound communication.",
  APPEND_ONLY: "Communication logs cannot be edited. Create an addendum instead.",
} as const;

export class CrmCommunicationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number = 400,
    readonly field?: string
  ) {
    super(message);
    this.name = "CrmCommunicationError";
  }
}
