/**
 * Purpose:
 * Render the business selection page for multi-membership users only.
 *
 * Business Context:
 * Switch Business is available only when the Platform User belongs to more
 * than one business (ADR-012 / BP-001 UX correction).
 *
 * Cookie writes must not occur during page render. Single-business auto-select
 * happens in login/register Server Actions via BusinessContextService.
 */

import Link from "next/link";
import { redirect } from "next/navigation";

import { SelectBusinessList } from "@/app/(authenticated)/select-business/select-business-list";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { buttonVariants } from "@/components/ui/button";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { cn } from "@/lib/utils";

export default async function SelectBusinessPage() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const businessContextService = createBusinessContextService();
  const businesses = await businessContextService.getSelectableBusinesses(
    user.platformUserId
  );

  // 0 or 1 business — no Switch Business UI; never mutate cookies here.
  if (businesses.length < 2) {
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
