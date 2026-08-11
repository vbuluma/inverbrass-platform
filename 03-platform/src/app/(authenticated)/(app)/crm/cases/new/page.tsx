import { redirect } from "next/navigation";

import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { getCrmCaseRegistrationCataloguesAction } from "@/modules/crm-case/actions/crm-case-actions";
import { CrmCaseRegistrationForm } from "@/modules/crm-case/components/crm-case-registration-form";

type PageProps = { searchParams: Promise<{ partyId?: string }> };

export default async function NewCrmCasePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const user = await createAuthService().getAuthenticatedUser();
  if (!user) redirect("/login");

  const context = await createBusinessContextService().getCurrentContext();
  if (!context) redirect("/select-business");

  const cataloguesResult = await getCrmCaseRegistrationCataloguesAction();
  if (!cataloguesResult.success) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Create Case</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {cataloguesResult.error.message}
        </p>
      </main>
    );
  }

  return (
    <CrmCaseRegistrationForm
      catalogues={cataloguesResult.data}
      defaultOwnerUserId={context.platformUserId}
      defaultPartyId={params.partyId}
    />
  );
}
