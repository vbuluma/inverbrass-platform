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
  authUserId: string;
  platformUserId: string;
  phoneNumber: string;
  email: string | null;
  firstName: string;
  lastName: string;
  isActive: boolean;
  mustChangePassword: boolean;
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
};

export type OwnerRegistrationPayload = {
  firstName: string;
  lastName: string;
  mobileNumber: string;
  countryCode: string;
  email?: string;
  password: string;
  confirmPassword: string;
  securityQuestionId: string;
  securityAnswer: string;
  businessName: string;
  businessTypeId: string;
  businessCountryCode: string;
  businessMobileNumber: string;
  businessEmail?: string;
};

export type OwnerRegistrationResult = {
  user: AuthSessionUser;
  businessContext: CurrentBusinessContext;
  businessId: string;
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
};

export type FirstLoginContext = {
  user: AuthSessionUser;
  businessContext: CurrentBusinessContext | null;
  requiresSecurityQuestion: boolean;
};

export type OwnerRegistrationUiPayload = {
  businessName: string;
  businessTypeId: string;
  countryCode: string;
  mobileNumber: string;
  password: string;
  confirmPassword: string;
  securityQuestionId: string;
  securityAnswer: string;
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
};

export type CountryOption = {
  code: string;
  name: string;
  phoneCode: string;
};

export type BusinessTypeOption = {
  id: string;
  name: string;
  code: string;
};
