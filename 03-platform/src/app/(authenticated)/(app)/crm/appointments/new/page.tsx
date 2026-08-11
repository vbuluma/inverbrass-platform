/**
 * BP-004 / IP-06 Schedule appointment route.
 */

import { redirect } from "next/navigation";

import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { getCrmAppointmentRegistrationCataloguesAction } from "@/modules/crm-appointment/actions/crm-appointment-actions";
import { CrmAppointmentRegistrationForm } from "@/modules/crm-appointment/components/crm-appointment-registration-form";

type PageProps = {
  searchParams: Promise<{ partyId?: string }>;
};

export default async function NewCrmAppointmentPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();

  if (!context) {
    redirect("/select-business");
  }

  const cataloguesResult = await getCrmAppointmentRegistrationCataloguesAction();

  if (!cataloguesResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Schedule Appointment</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {cataloguesResult.error.message}
        </p>
      </main>
    );
  }

  return (
    <CrmAppointmentRegistrationForm
      catalogues={cataloguesResult.data}
      defaultOwnerUserId={context.platformUserId}
      defaultPartyId={params.partyId}
    />
  );
}
