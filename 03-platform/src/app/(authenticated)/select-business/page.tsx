/**
 * Purpose:
 * Render the business selection page for authenticated multi-membership users.
 *
 * Business Context:
 * Users with more than one active membership must explicitly choose their current
 * business before accessing dashboard and other business modules (ADR-012).
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (ADR-012)
 *
 * Implementation Package:
 * IP-005 – Authentication UI
 *
 * Responsibilities:
 * - Load selectable businesses for the authenticated user
 * - Render the selection list within the shared auth shell
 *
 * Non-Responsibilities:
 * - Business context cookie signing (BusinessContextService)
 * - Membership eligibility checks (BusinessContextService)
 *
 * Dependencies:
 * - getSelectableBusinessesAction, SelectBusinessList, AuthPageShell
 *
 * Business Rules Implemented:
 * - ADR-012 — explicit business selection for multi-membership users
 *
 * Extension Points:
 * - Auto-select single membership may be added when product policy requires it
 */

import Link from "next/link";
import { redirect } from "next/navigation";

import { SelectBusinessList } from "@/app/(authenticated)/select-business/select-business-list";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { buttonVariants } from "@/components/ui/button";
import { getSelectableBusinessesAction } from "@/core/auth/actions/select-business-actions";
import { cn } from "@/lib/utils";

export default async function SelectBusinessPage() {
  const businessesResult = await getSelectableBusinessesAction();

  if (!businessesResult.success) {
    redirect("/login");
  }

  const businesses = businessesResult.data;

  if (businesses.length === 0) {
    redirect("/home");
  }

  return (
    <AuthPageShell
      title="Switch Business"
      description="Choose the business you want to work in for this session."
      footer={
        <Link
          href="/home"
          className={cn(buttonVariants({ variant: "ghost" }), "w-full")}
        >
          Back to Platform Home
        </Link>
      }
    >
      <SelectBusinessList businesses={businesses} />
    </AuthPageShell>
  );
}
