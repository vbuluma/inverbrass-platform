/**
 * Purpose:
 * Render Platform Home — the post-authentication entry point for Industry Solutions.
 *
 * Design rationale:
 * CTA matrix is membership-count driven:
 * - 0 businesses → Create Business only (no Switch Business)
 * - 1 business → Open Business; hide Switch Business
 * - 2+ businesses → Open list + Switch Business
 *
 * Cookie writes are forbidden during page render. Session/business cookies are
 * set only by Server Actions (login, register, open/switch business, logout).
 *
 * Why this exists:
 * BP-001 UX correction — never prompt to switch before a second business exists.
 */

import Link from "next/link";
import { redirect } from "next/navigation";

import { PlatformHomeBusinessList } from "@/app/(authenticated)/home/platform-home-business-list";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { logoutAction } from "@/core/auth/actions/auth-actions";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { cn } from "@/lib/utils";

async function signOutAction() {
  "use server";

  try {
    await logoutAction();
    redirect("/login");
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    redirect("/login");
  }
}

export default async function PlatformHomePage() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.mustChangePassword) {
    redirect("/first-login");
  }

  // Read-only: never set/clear cookies while rendering Platform Home.
  const businessContextService = createBusinessContextService();
  const businesses = await businessContextService.getSelectableBusinesses(
    user.platformUserId
  );

  const displayName =
    `${user.firstName} ${user.lastName}`.trim() || user.email || "User";
  const businessCount = businesses.length;
  const canSwitchBusiness = businessCount >= 2;

  return (
    <AuthPageShell
      title={businessCount > 0 ? "Platform Home" : `Welcome ${displayName}`}
      description={
        businessCount === 0
          ? "You do not have a business yet. Create one to start setup."
          : businessCount === 1
            ? "Open your business to continue, or manage your platform profile."
            : "Choose a business to continue, create another, or switch businesses."
      }
      className="max-w-lg"
      footer={
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" className="w-full">
            Sign out
          </Button>
        </form>
      }
    >
      <div className="space-y-3">
        {businessCount > 0 ? (
          <PlatformHomeBusinessList businesses={businesses} />
        ) : null}

        <Link
          href="/businesses/create"
          className={cn(buttonVariants(), "w-full")}
        >
          Create Business
        </Link>

        {canSwitchBusiness ? (
          <Link
            href="/select-business"
            className={cn(buttonVariants({ variant: "outline" }), "w-full")}
          >
            Switch Business
          </Link>
        ) : null}

        <Link
          href="/profile"
          className={cn(buttonVariants({ variant: "outline" }), "w-full")}
        >
          Manage Profile
        </Link>
      </div>
    </AuthPageShell>
  );
}
