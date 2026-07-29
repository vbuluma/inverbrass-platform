/**
 * Purpose:
 * Resolve user identity for greetings and dashboard display (UX-001.2).
 *
 * Priority (never greet with phone unless absolutely necessary):
 * Preferred Name → First Name → Display Name → Full Name → Username → Email → Phone
 */

export type UserIdentityFields = {
  preferredName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  /** Platform username — typically staffCode or login identifier. */
  username?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
};

function normalize(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isSyntheticPlatformLabel(value: string): boolean {
  return value.toLowerCase() === "platform user";
}

function isSyntheticBusinessUserPattern(
  firstName: string,
  lastName: string,
  businessName: string
): boolean {
  const business = businessName.trim().toLowerCase();
  const first = firstName.trim().toLowerCase();
  const last = lastName.trim().toLowerCase();
  if (last !== "user" || first.length === 0) {
    return false;
  }
  return (
    business === first ||
    business.startsWith(`${first} `) ||
    business.startsWith(first)
  );
}

/**
 * WHAT: Resolve the personal name used in time-based greetings.
 * WHY: Greetings use a single friendly name — "Good Afternoon, Vincent".
 */
export function resolveUserGreetingName(
  fields: UserIdentityFields,
  options?: { businessName?: string }
): string {
  const preferredName = normalize(fields.preferredName);
  const firstName = normalize(fields.firstName);
  const lastName = normalize(fields.lastName);
  const displayName = normalize(fields.displayName);
  const username = normalize(fields.username);
  const email = normalize(fields.email);
  const phoneNumber = normalize(fields.phoneNumber);
  const businessName = options?.businessName ?? "";

  if (
    firstName &&
    lastName &&
    businessName &&
    isSyntheticBusinessUserPattern(firstName, lastName, businessName)
  ) {
    return username ?? email ?? firstName ?? "there";
  }

  if (preferredName) {
    return preferredName;
  }
  if (firstName) {
    return firstName;
  }
  if (displayName) {
    return displayName.split(/\s+/)[0] ?? displayName;
  }

  const fullName = normalize(
    [fields.firstName, fields.lastName].filter(Boolean).join(" ")
  );
  if (fullName && !isSyntheticPlatformLabel(fullName)) {
    return fullName.split(/\s+/)[0] ?? fullName;
  }
  if (displayName) {
    return displayName;
  }
  if (username) {
    return username;
  }
  if (email) {
    return email.split("@")[0] ?? email;
  }
  if (phoneNumber) {
    return phoneNumber;
  }

  return "there";
}

/**
 * WHAT: Resolve full display identity for chrome and audit surfaces.
 */
export function resolveUserDisplayName(fields: UserIdentityFields): string {
  const preferredName = normalize(fields.preferredName);
  const firstName = normalize(fields.firstName);
  const displayName = normalize(fields.displayName);
  const username = normalize(fields.username);
  const email = normalize(fields.email);
  const phoneNumber = normalize(fields.phoneNumber);

  if (preferredName) {
    return preferredName;
  }
  if (firstName) {
    return firstName;
  }
  if (displayName) {
    return displayName;
  }

  const fullName = normalize(
    [fields.firstName, fields.lastName].filter(Boolean).join(" ")
  );
  if (fullName && !isSyntheticPlatformLabel(fullName)) {
    return fullName;
  }
  if (username) {
    return username;
  }
  if (email) {
    return email;
  }
  if (phoneNumber) {
    return phoneNumber;
  }

  return "User";
}
