/**
 * Purpose:
 * Lead registration page.
 *
 * Implementation Package:
 * BP-004 / IP-02 – Lead Management
 */

import { redirect } from "next/navigation";

import { CrmModuleErrorPage } from "@/modules/crm/components/crm-module-error-page";
import {
  getLeadRegistrationCataloguesAction,
} from "@/modules/crm/lead/actions/lead-actions";
import { LeadRegistrationForm } from "@/modules/crm/lead/components/lead-registration-form";

export default async function NewLeadPage() {
  const result = await getLeadRegistrationCataloguesAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "INVALID_INPUT"
    ) {
      redirect("/select-business");
    }

    return <CrmModuleErrorPage message={result.error.message} />;
  }

  return <LeadRegistrationForm catalogues={result.data} />;
}
