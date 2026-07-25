/**
 * Purpose:
 * Browser-side password strength and confirm-password matching helpers that
 * mirror the authoritative server password policy.
 *
 * Design rationale:
 * Live validation improves UX while the server Zod policy remains authoritative.
 * Shared rule definitions keep client checklists aligned with passwordPolicySchema.
 *
 * Why this exists:
 * BP-001 foundation correction requires Register to disable submit until policy
 * and confirm-password checks pass without requiring form submission.
 *
 * Implementation Package:
 * BP-001 Foundation Alignment
 */

export type PasswordRuleId =
  | "minLength"
  | "uppercase"
  | "lowercase"
  | "number"
  | "special";

export type PasswordRuleResult = {
  id: PasswordRuleId;
  label: string;
  met: boolean;
};

const MIN_LENGTH = 8;

/**
 * WHAT: Evaluate each password policy rule for live checklist rendering.
 * WHY: Users see which requirements remain before the Register button enables.
 */
export function evaluatePasswordStrength(password: string): PasswordRuleResult[] {
  return [
    {
      id: "minLength",
      label: `At least ${MIN_LENGTH} characters`,
      met: password.length >= MIN_LENGTH,
    },
    {
      id: "uppercase",
      label: "One uppercase letter",
      met: /[A-Z]/.test(password),
    },
    {
      id: "lowercase",
      label: "One lowercase letter",
      met: /[a-z]/.test(password),
    },
    {
      id: "number",
      label: "One number",
      met: /[0-9]/.test(password),
    },
    {
      id: "special",
      label: "One special character",
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];
}

/**
 * WHAT: True when every password policy rule is satisfied.
 * WHY: Gates the Register button alongside confirm-password matching.
 */
export function isPasswordPolicySatisfied(password: string): boolean {
  return evaluatePasswordStrength(password).every((rule) => rule.met);
}

/**
 * WHAT: Live confirm-password match state for UI feedback.
 * WHY: Show match / mismatch without submitting the form.
 */
export function getPasswordMatchState(
  password: string,
  confirmPassword: string
): "empty" | "match" | "mismatch" {
  if (confirmPassword.length === 0) {
    return "empty";
  }

  return password === confirmPassword ? "match" : "mismatch";
}
