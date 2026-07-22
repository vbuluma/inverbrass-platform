import { z } from "zod";

const UPPERCASE_PATTERN = /[A-Z]/;
const LOWERCASE_PATTERN = /[a-z]/;
const NUMBER_PATTERN = /[0-9]/;
const SPECIAL_CHARACTER_PATTERN = /[^A-Za-z0-9]/;

export const passwordPolicySchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(UPPERCASE_PATTERN, "Password must include at least one uppercase letter.")
  .regex(LOWERCASE_PATTERN, "Password must include at least one lowercase letter.")
  .regex(NUMBER_PATTERN, "Password must include at least one number.")
  .regex(
    SPECIAL_CHARACTER_PATTERN,
    "Password must include at least one special character."
  );

export function validatePasswordPolicy(password: string): {
  valid: boolean;
  message?: string;
} {
  const parsed = passwordPolicySchema.safeParse(password);

  if (parsed.success) {
    return { valid: true };
  }

  return {
    valid: false,
    message: parsed.error.issues[0]?.message ?? "Password does not meet requirements.",
  };
}
