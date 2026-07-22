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
