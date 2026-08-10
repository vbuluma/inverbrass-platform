/**
 * BP-004 / IP-05 Create activity route.
 */

import { redirect } from "next/navigation";

import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { getCrmActivityRegistrationCataloguesAction } from "@/modules/crm-activity/actions/crm-activity-actions";
import { CrmActivityRegistrationForm } from "@/modules/crm-activity/components/crm-activity-registration-form";

type PageProps = {
  searchParams: Promise<{ partyId?: string }>;
};

export default async function NewCrmActivityPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();

  if (!user) {
    redirect("/sign-in");
  }

  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();

  if (!context) {
    redirect("/select-business");
  }

  const cataloguesResult = await getCrmActivityRegistrationCataloguesAction();

  if (!cataloguesResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Log Activity</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {cataloguesResult.error.message}
        </p>
      </main>
    );
  }

  return (
    <CrmActivityRegistrationForm
      catalogues={cataloguesResult.data}
      defaultOwnerUserId={context.platformUserId}
      defaultPartyId={params.partyId}
    />
  );
}
