/**
 * Purpose:
 * Gate setup routes on authenticated session and validated business context.
 *
 * Business Context:
 * Setup is available to DRAFT businesses; operational modules remain blocked.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (A4)
 *
 * Implementation Package:
 * IP-006 – Business Setup Wizard, Configuration & Activation
 */

import {
  assertAuthenticatedSession,
  assertBusinessContextAvailable,
  assertFirstLoginCompleted,
} from "@/core/auth/guards/authenticated-route-guard";

export default async function SetupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await assertAuthenticatedSession();
  await assertFirstLoginCompleted();
  await assertBusinessContextAvailable();

  return children;
}
