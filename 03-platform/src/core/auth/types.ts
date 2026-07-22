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
