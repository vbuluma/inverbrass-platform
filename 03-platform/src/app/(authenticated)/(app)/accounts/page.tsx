import { redirect } from "next/navigation";

import { CrmModuleErrorPage } from "@/modules/crm/components/crm-module-error-page";
import { getAccountDashboardAction } from "@/modules/crm/account/actions/account-actions";
import { AccountDashboard } from "@/modules/crm/account/components/account-dashboard";

export default async function AccountsPage() {
  const result = await getAccountDashboardAction();

  if (!result.success) {
    if (result.error.code === "INVALID_INPUT") {
      redirect("/select-business");
    }
    return <CrmModuleErrorPage message={result.error.message} />;
  }

  return <AccountDashboard data={result.data} />;
}
