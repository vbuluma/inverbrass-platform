/**
 * Purpose:
 * Register CRM customer from existing Party.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

import { redirect } from "next/navigation";

import { getCrmRegistrationCataloguesAction } from "@/modules/crm/actions/crm-actions";
import { CrmRegistrationForm } from "@/modules/crm/components/crm-registration-form";
import { CrmModuleErrorPage } from "@/modules/crm/components/crm-module-error-page";

export default async function RegisterCustomerPage() {
  const result = await getCrmRegistrationCataloguesAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <CrmModuleErrorPage
        message={result.error.message}
        titleKind="registration"
      />
    );
  }

  return <CrmRegistrationForm catalogues={result.data} />;
}
