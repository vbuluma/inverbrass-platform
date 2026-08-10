import { redirect } from "next/navigation";

import { CrmModuleErrorPage } from "@/modules/crm/components/crm-module-error-page";
import { getAccountRegistrationCataloguesAction } from "@/modules/crm/account/actions/account-actions";
import { AccountRegistrationForm } from "@/modules/crm/account/components/account-registration-form";

type NewAccountPageProps = {
  searchParams: Promise<{ crmRecordId?: string }>;
};

export default async function NewAccountPage({ searchParams }: NewAccountPageProps) {
  const params = await searchParams;
  const result = await getAccountRegistrationCataloguesAction();

  if (!result.success) {
    if (result.error.code === "INVALID_INPUT") {
      redirect("/select-business");
    }
    return <CrmModuleErrorPage message={result.error.message} />;
  }

  return (
    <AccountRegistrationForm
      catalogues={result.data}
      defaultCrmRecordId={params.crmRecordId}
    />
  );
}
