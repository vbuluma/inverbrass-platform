/**
 * Purpose:
 * Render Platform Home — post-auth landing for the BP-001 customer journey.
 *
 * Design rationale:
 * Two clear sections keep platform and business concerns separate:
 * - My Businesses — Open / Switch (if >1) / Create Business
 * - My Account — platform identity settings (not business configuration)
 *
 * Cookie writes are forbidden during page render.
 *
 * Why this exists:
 * BP-001 Final UX Alignment to the approved customer journey.
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
      title={`Welcome ${displayName}`}
      description={
        businessCount === 0
          ? "You have: 0 Businesses"
          : businessCount === 1
            ? "You have: 1 Business"
            : `You have: ${businessCount} Businesses`
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
      <div className="space-y-8">
        <section className="space-y-3" aria-labelledby="my-businesses-heading">
          <div className="space-y-1">
            <h2 id="my-businesses-heading" className="text-base font-semibold">
              My Businesses
            </h2>
            <p className="text-sm text-muted-foreground">
              Open a business to operate, or create a new one. Business setup and
              configuration happen inside each business.
            </p>
          </div>

          {businessCount > 0 ? (
            <PlatformHomeBusinessList businesses={businesses} />
          ) : (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
              No businesses yet. Create your first business to start setup.
            </p>
          )}

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
        </section>

        <section className="space-y-3" aria-labelledby="my-account-heading">
          <div className="space-y-1">
            <h2 id="my-account-heading" className="text-base font-semibold">
              My Account
            </h2>
            <p className="text-sm text-muted-foreground">
              Platform account settings only. Separate from business management.
            </p>
          </div>

          <Link
            href="/profile"
            className={cn(buttonVariants({ variant: "outline" }), "w-full")}
          >
            My Account
          </Link>
        </section>
      </div>
    </AuthPageShell>
  );
}
