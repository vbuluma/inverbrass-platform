export const BUSINESS_MEMBERSHIP_STATUS = {
  ACTIVE: "ACTIVE",
  INVITED: "INVITED",
  SUSPENDED: "SUSPENDED",
  ENDED: "ENDED",
} as const;

export const BUSINESS_STATUS = {
  ACTIVE: "ACTIVE",
  DRAFT: "DRAFT",
  SUSPENDED: "SUSPENDED",
  CLOSED: "CLOSED",
} as const;

export const BUSINESS_CONTEXT_COOKIE = "inverbrass-business-context";

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

export const PLATFORM_ROLE_CODES = {
  OWNER: "OWNER",
} as const;

export const LOCKOUT_THRESHOLD = 5;
export const LOCKOUT_DURATION_MINUTES = 15;
