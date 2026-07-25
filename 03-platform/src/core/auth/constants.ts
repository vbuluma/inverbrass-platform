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

/**
 * WHAT: Platform authentication session cookie (Stage 1).
 * WHY: HttpOnly signed cookie replaces Supabase Auth JWT as the session transport.
 */
export const AUTH_SESSION_COOKIE = "inverbrass-auth-session";

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

/** bcrypt cost factor for password and security-answer hashes. */
export const PASSWORD_BCRYPT_ROUNDS = 12;

export const PLATFORM_ROLE_CODES = {
  OWNER: "OWNER",
} as const;

export const LOCKOUT_THRESHOLD = 5;
export const LOCKOUT_DURATION_MINUTES = 15;
