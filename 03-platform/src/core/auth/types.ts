/**
 * Purpose:
 * Shared authentication and onboarding type contracts for BP-001.
 *
 * Design rationale:
 * Platform Registration and Business Registration use distinct payloads so
 * signup never implies Tenant Business creation.
 *
 * Why this exists:
 * Keeps UI, actions, and services aligned on identity vs business provisioning.
 */

export type ClientContext = {
  ipAddress?: string;
  userAgent?: string;
};

export type CurrentBusinessContext = {
  platformUserId: string;
  businessId: string;
  businessMembershipId: string;
};

export type AuthSessionUser = {
  /** Legacy IdP bridge — null for Stage 1 platform-owned auth users. */
  authUserId: string | null;
  platformUserId: string;
  phoneNumber: string;
  email: string | null;
  firstName: string;
  lastName: string;
  /** Optional platform display name (UX-001.2 identity hierarchy). */
  displayName: string | null;
  /** Platform username / staff identifier. */
  staffCode: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  /** Optional temporary onboarding value from Platform Registration. */
  proposedBusinessName: string | null;
};

export type LoginCredentials = {
  mobileNumber: string;
  password: string;
  countryCode: string;
};

export type LoginResult = {
  user: AuthSessionUser;
  businessContext: CurrentBusinessContext | null;
  requiresBusinessSelection: boolean;
  requiresPasswordChange: boolean;
  /** True when the Platform User has no business memberships yet. */
  hasNoBusinesses: boolean;
};

/**
 * Platform Registration service payload — creates a Platform User only.
 */
export type OwnerRegistrationPayload = {
  firstName: string;
  lastName: string;
  mobileNumber: string;
  countryCode: string;
  /** Optional — not required for registration or login. */
  email?: string;
  password: string;
  confirmPassword: string;
  securityQuestionId: string;
  securityAnswer: string;
  /** Optional proposed business name; does not create a Business row. */
  businessName?: string;
};

export type OwnerRegistrationResult = {
  user: AuthSessionUser;
  platformUserId: string;
};

export type FirstLoginPayload = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  securityQuestionId?: string;
  securityAnswer?: string;
};

export type FirstLoginResult = {
  user: AuthSessionUser;
  businessContext: CurrentBusinessContext | null;
  requiresBusinessSelection: boolean;
  hasNoBusinesses: boolean;
};

export type FirstLoginContext = {
  user: AuthSessionUser;
  businessContext: CurrentBusinessContext | null;
  requiresSecurityQuestion: boolean;
};

/**
 * Platform Registration UI payload — no industry/template/business type.
 */
export type OwnerRegistrationUiPayload = {
  /** Optional proposed business name. */
  businessName?: string;
  countryCode: string;
  mobileNumber: string;
  /** Optional contact email. */
  email?: string;
  password: string;
  confirmPassword: string;
  securityQuestionId: string;
  securityAnswer: string;
};

/**
 * Business Registration create payload — starts Tenant Business provisioning.
 */
export type CreateBusinessPayload = {
  businessName: string;
  industryId: string;
  /** Business Template (business_type) filtered by industry. */
  businessTypeId: string;
  countryCode: string;
  mobileNumber?: string;
};

export type CreateBusinessResult = {
  businessId: string;
  businessMembershipId: string;
  businessContext: CurrentBusinessContext;
};

export type RecoveryInitiationPayload = {
  mobileNumber: string;
  countryCode: string;
};

export type RecoveryInitiationResult = {
  securityQuestionText: string;
  mobileNumber: string;
  countryCode: string;
};

export type RecoveryCompletionPayload = {
  mobileNumber: string;
  countryCode: string;
  securityAnswer: string;
  newPassword: string;
  confirmPassword: string;
};

export type SelectableBusiness = {
  membershipId: string;
  businessId: string;
  businessName: string;
  businessTypeName: string;
  countryName: string;
  isOwner: boolean;
  isPrimary: boolean;
  businessStatusCode: string;
};

export type CountryOption = {
  code: string;
  name: string;
  phoneCode: string;
  currencyCode?: string;
};

export type CurrencyOption = {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isActive: boolean;
};

export type IndustryOption = {
  id: string;
  name: string;
  code: string;
  description: string | null;
};

export type BusinessTypeOption = {
  id: string;
  name: string;
  code: string;
  industryId: string;
};
