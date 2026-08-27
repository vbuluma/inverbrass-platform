import { redirect } from "next/navigation";

import { CrmModuleErrorPage } from "@/modules/crm/components/crm-module-error-page";
import {
  getOpportunityAction,
  getOpportunityRegistrationCataloguesAction,
} from "@/modules/crm/opportunity/actions/opportunity-actions";
import { OpportunityWorkspace } from "@/modules/crm/opportunity/components/opportunity-workspace";

type OpportunityDetailPageProps = {
  params: Promise<{ opportunityId: string }>;
};

export default async function OpportunityDetailPage({
  params,
}: OpportunityDetailPageProps) {
  const { opportunityId } = await params;

  const [opportunityResult, cataloguesResult] = await Promise.all([
    getOpportunityAction(opportunityId),
    getOpportunityRegistrationCataloguesAction(),
  ]);

  if (!opportunityResult.success) {
    if (opportunityResult.error.code === "INVALID_INPUT") {
      redirect("/select-business");
    }
    return <CrmModuleErrorPage message={opportunityResult.error.message} />;
  }

  if (!cataloguesResult.success) {
    return <CrmModuleErrorPage message={cataloguesResult.error.message} />;
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <OpportunityWorkspace
        opportunity={opportunityResult.data}
        catalogues={cataloguesResult.data}
      />
    </main>
  );
}
