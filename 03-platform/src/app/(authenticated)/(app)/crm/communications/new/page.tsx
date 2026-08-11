import { redirect } from "next/navigation";

import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { getCrmCommunicationRegistrationCataloguesAction } from "@/modules/crm-communication/actions/crm-communication-actions";
import { CrmCommunicationRegistrationForm } from "@/modules/crm-communication/components/crm-communication-registration-form";

type PageProps = { searchParams: Promise<{ partyId?: string }> };

export default async function NewCrmCommunicationPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const user = await createAuthService().getAuthenticatedUser();
  if (!user) redirect("/login");

  const context = await createBusinessContextService().getCurrentContext();
  if (!context) redirect("/select-business");

  const cataloguesResult = await getCrmCommunicationRegistrationCataloguesAction();
  if (!cataloguesResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Log Communication</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {cataloguesResult.error.message}
        </p>
      </main>
    );
  }

  return (
    <CrmCommunicationRegistrationForm
      catalogues={cataloguesResult.data}
      defaultOwnerUserId={context.platformUserId}
      defaultPartyId={params.partyId}
    />
  );
}
