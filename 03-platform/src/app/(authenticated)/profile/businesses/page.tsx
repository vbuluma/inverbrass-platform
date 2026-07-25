/**
 * Purpose:
 * My Businesses section of Manage Profile — membership list only.
 *
 * Design rationale:
 * Lists businesses the Platform User belongs to. Opening a business sets
 * context and enters setup/dashboard. No business configuration lives here.
 *
 * Why this exists:
 * BP-001 — My Businesses is a Platform User view, not a business settings page.
 */

import Link from "next/link";
import { redirect } from "next/navigation";

import { PlatformHomeBusinessList } from "@/app/(authenticated)/home/platform-home-business-list";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { buttonVariants } from "@/components/ui/button";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { cn } from "@/lib/utils";

export default async function MyBusinessesProfilePage() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const businessContextService = createBusinessContextService();
  const businesses = await businessContextService.getSelectableBusinesses(
    user.platformUserId
  );

  return (
    <AuthPageShell
      title="My Businesses"
      description="Businesses you own or belong to. Open a business to work in it."
      className="max-w-lg"
    >
      <div className="space-y-3">
        {businesses.length > 0 ? (
          <PlatformHomeBusinessList businesses={businesses} />
        ) : (
          <p className="text-sm text-muted-foreground">
            You do not belong to any business yet.
          </p>
        )}

        <Link
          href="/businesses/create"
          className={cn(buttonVariants(), "w-full")}
        >
          Create Business
        </Link>

        <Link
          href="/profile"
          className={cn(buttonVariants({ variant: "outline" }), "w-full")}
        >
          Back to Manage Profile
        </Link>
      </div>
    </AuthPageShell>
  );
}
