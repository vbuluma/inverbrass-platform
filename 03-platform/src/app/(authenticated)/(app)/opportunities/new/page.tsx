import { redirect } from "next/navigation";

import { CrmModuleErrorPage } from "@/modules/crm/components/crm-module-error-page";
import { getOpportunityRegistrationCataloguesAction } from "@/modules/crm/opportunity/actions/opportunity-actions";
import { OpportunityRegistrationForm } from "@/modules/crm/opportunity/components/opportunity-registration-form";

type NewOpportunityPageProps = {
  searchParams: Promise<{ crmRecordId?: string }>;
};

export default async function NewOpportunityPage({ searchParams }: NewOpportunityPageProps) {
  const params = await searchParams;
  const result = await getOpportunityRegistrationCataloguesAction();

  if (!result.success) {
    if (result.error.code === "INVALID_INPUT") {
      redirect("/select-business");
    }
    return <CrmModuleErrorPage message={result.error.message} />;
  }

  return (
    <OpportunityRegistrationForm
      catalogues={result.data}
      defaultCrmRecordId={params.crmRecordId}
    />
  );
}
