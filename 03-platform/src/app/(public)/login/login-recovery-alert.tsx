/**
 * Purpose:
 * Display a success alert after password recovery completes.
 *
 * Business Context:
 * Users returning from forgot-password completion should see confirmation that
 * their password was reset before signing in with the new credentials.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (§3.7)
 *
 * Implementation Package:
 * IP-005 – Authentication UI
 *
 * Responsibilities:
 * - Render a success alert when login is opened with ?recovered=1
 *
 * Non-Responsibilities:
 * - Recovery orchestration (PasswordRecoveryService)
 *
 * Dependencies:
 * - Alert UI component
 *
 * Business Rules Implemented:
 * - AD-009 §3.7 — successful recovery redirects to login
 *
 * Extension Points:
 * - Auto-dismiss or timed hide may be added in future UI polish
 */

import { CircleCheckIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";

export function LoginRecoveryAlert() {
  return (
    <Alert variant="success" className="mb-4">
      <CircleCheckIcon />
      <AlertDescription>
        Your password has been reset. Sign in with your new password.
      </AlertDescription>
    </Alert>
  );
}
