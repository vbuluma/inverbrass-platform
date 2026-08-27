import { redirect } from "next/navigation";

import { CrmModuleErrorPage } from "@/modules/crm/components/crm-module-error-page";
import {
  getAccountAction,
  getAccountRegistrationCataloguesAction,
} from "@/modules/crm/account/actions/account-actions";
import { AccountWorkspace } from "@/modules/crm/account/components/account-workspace";

type AccountDetailPageProps = {
  params: Promise<{ accountId: string }>;
};

export default async function AccountDetailPage({ params }: AccountDetailPageProps) {
  const { accountId } = await params;

  const [accountResult, cataloguesResult] = await Promise.all([
    getAccountAction(accountId),
    getAccountRegistrationCataloguesAction(),
  ]);

  if (!accountResult.success) {
    if (accountResult.error.code === "INVALID_INPUT") {
      redirect("/select-business");
    }
    return <CrmModuleErrorPage message={accountResult.error.message} />;
  }

  if (!cataloguesResult.success) {
    return <CrmModuleErrorPage message={cataloguesResult.error.message} />;
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <AccountWorkspace
        account={accountResult.data}
        catalogues={cataloguesResult.data}
      />
    </main>
  );
}
