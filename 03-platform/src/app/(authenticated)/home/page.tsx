/**
 * Purpose:
 * Render Platform Home — the post-authentication entry point for Industry Solutions.
 *
 * Design rationale:
 * When the Platform User has no businesses, show Create Business and account links.
 * When businesses exist, show My Businesses, Create Business, and Switch Business.
 *
 * Why this exists:
 * BP-001 foundation correction — registration no longer lands in the setup wizard.
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

  const businessContextService = createBusinessContextService();
  const businesses = await businessContextService.getSelectableBusinesses(
    user.platformUserId
  );

  const displayName =
    `${user.firstName} ${user.lastName}`.trim() || user.email || "User";
  const hasBusinesses = businesses.length > 0;

  return (
    <AuthPageShell
      title={hasBusinesses ? "My Businesses" : `Welcome ${displayName}`}
      description={
        hasBusinesses
          ? "Choose a business to continue, create another, or manage your account."
          : "You do not have a business yet. Create one to start an Industry Solution."
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
        {hasBusinesses ? (
          <PlatformHomeBusinessList businesses={businesses} />
        ) : null}

        <Link
          href="/businesses/create"
          className={cn(buttonVariants(), "w-full")}
        >
          Create Business
        </Link>

        {hasBusinesses ? (
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

        <Link
          href={hasBusinesses ? "/account" : "/security"}
          className={cn(buttonVariants({ variant: "outline" }), "w-full")}
        >
          {hasBusinesses ? "Account Settings" : "Security Settings"}
        </Link>
      </div>
    </AuthPageShell>
  );
}
