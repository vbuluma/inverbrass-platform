/**
 * Purpose:
 * Render the business selection page and auto-select when only one business exists.
 *
 * Business Context:
 * Users with multiple active memberships choose their current business context before
 * entering business modules. A single membership is initialized automatically.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (ADR-012)
 *
 * Implementation Package:
 * IP-005 – Authentication UI
 *
 * Responsibilities:
 * - Load selectable businesses for the authenticated user
 * - Auto-select and redirect when only one business is available
 * - Render business selection list for multi-business users
 *
 * Non-Responsibilities:
 * - Membership validation beyond BusinessContextService rules
 * - Business module rendering
 *
 * Dependencies:
 * - getSelectableBusinessesAction, BusinessContextService, SelectBusinessList
 *
 * Business Rules Implemented:
 * - ADR-012 — current business context required for business modules
 *
 * Extension Points:
 * - Search or filtering may be added when membership counts grow
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SelectBusinessList } from "@/app/(authenticated)/select-business/select-business-list";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { getSelectableBusinessesAction } from "@/core/auth/actions/select-business-actions";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { getClientContextFromHeaders } from "@/core/auth/utils/helpers";

export default async function SelectBusinessPage() {
  const result = await getSelectableBusinessesAction();

  if (!result.success) {
    redirect("/login");
  }

  if (result.data.length === 1) {
    const requestHeaders = await headers();
    const businessContextService = createBusinessContextService();

    await businessContextService.setCurrentBusiness(
      result.data[0].membershipId,
      getClientContextFromHeaders(requestHeaders)
    );

    redirect("/dashboard");
  }

  return (
    <AuthPageShell
      title="Select a business"
      description="Choose the business you want to work with."
      className="max-w-lg"
    >
      <SelectBusinessList businesses={result.data} />
    </AuthPageShell>
  );
}
