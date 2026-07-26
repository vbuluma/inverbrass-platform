/**
 * Purpose:
 * Personal Information section of My Account.
 *
 * Why this exists:
 * BP-001 — Platform User identity details without business configuration fields.
 */

import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { buttonVariants } from "@/components/ui/button";
import { createAuthService } from "@/core/auth/services/auth-service";
import { cn } from "@/lib/utils";

export default async function PersonalInformationPage() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AuthPageShell
      title="Personal Information"
      description="Your Platform User identity details."
      className="max-w-lg"
    >
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-muted-foreground">First name</dt>
          <dd className="font-medium">{user.firstName}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Last name</dt>
          <dd className="font-medium">{user.lastName}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="font-medium">{user.email ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Mobile</dt>
          <dd className="font-medium">{user.phoneNumber || "—"}</dd>
        </div>
      </dl>

      <Link
        href="/profile"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "mt-6 w-full"
        )}
      >
        Back to My Account
      </Link>
    </AuthPageShell>
  );
}
