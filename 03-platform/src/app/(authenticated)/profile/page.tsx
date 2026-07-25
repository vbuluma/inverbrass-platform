/**
 * Purpose:
 * Manage Profile entry point from Platform Home.
 *
 * Why this exists:
 * BP-001 Platform Home requires a Manage Profile destination for Platform Users.
 */

import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { buttonVariants } from "@/components/ui/button";
import { createAuthService } from "@/core/auth/services/auth-service";
import { cn } from "@/lib/utils";

export default async function ProfilePage() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AuthPageShell
      title="Manage Profile"
      description="Review your Platform User identity details."
      className="max-w-lg"
    >
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Name</dt>
          <dd className="font-medium">
            {user.firstName} {user.lastName}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="font-medium">{user.email ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Mobile</dt>
          <dd className="font-medium">{user.phoneNumber || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Proposed business name</dt>
          <dd className="font-medium">{user.proposedBusinessName ?? "—"}</dd>
        </div>
      </dl>

      <Link
        href="/home"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "mt-6 w-full"
        )}
      >
        Back to Platform Home
      </Link>
    </AuthPageShell>
  );
}
