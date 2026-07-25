/**
 * Purpose:
 * Platform Account section — Platform User account identity only.
 *
 * Why this exists:
 * BP-001 — account hub is platform-scoped; business settings live under the
 * active business.
 */

import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { buttonVariants } from "@/components/ui/button";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { cn } from "@/lib/utils";

export default async function PlatformAccountPage() {
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
      title="Platform Account"
      description="Your InverBrass Platform User account."
      className="max-w-lg"
    >
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Display name</dt>
          <dd className="font-medium">
            {`${user.firstName} ${user.lastName}`.trim() || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Mobile (username)</dt>
          <dd className="font-medium">{user.phoneNumber || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="font-medium">{user.email ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Business memberships</dt>
          <dd className="font-medium">{businesses.length}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Account status</dt>
          <dd className="font-medium">Active</dd>
        </div>
      </dl>

      <div className="mt-6 space-y-3">
        <Link
          href="/profile"
          className={cn(buttonVariants({ variant: "outline" }), "w-full")}
        >
          Back to Manage Profile
        </Link>
        <Link
          href="/home"
          className={cn(buttonVariants({ variant: "ghost" }), "w-full")}
        >
          Back to Platform Home
        </Link>
      </div>
    </AuthPageShell>
  );
}
