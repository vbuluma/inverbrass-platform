import { redirect } from "next/navigation";

import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { getCrmVisitRegistrationCataloguesAction } from "@/modules/crm-visit/actions/crm-visit-actions";
import { CrmVisitRegistrationForm } from "@/modules/crm-visit/components/crm-visit-registration-form";

type PageProps = {
  searchParams: Promise<{ partyId?: string; appointmentId?: string }>;
};

export default async function NewCrmVisitPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  if (!user) redirect("/login");

  const context = await createBusinessContextService().getCurrentContext();
  if (!context) redirect("/select-business");

  const cataloguesResult = await getCrmVisitRegistrationCataloguesAction();
  if (!cataloguesResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Log Visit</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {cataloguesResult.error.message}
        </p>
      </main>
    );
  }

  return (
    <CrmVisitRegistrationForm
      catalogues={cataloguesResult.data}
      defaultOwnerUserId={context.platformUserId}
      defaultPartyId={params.partyId}
      defaultAppointmentId={params.appointmentId}
    />
  );
}
