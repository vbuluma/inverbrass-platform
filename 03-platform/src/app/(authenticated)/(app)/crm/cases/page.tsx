import { redirect } from "next/navigation";

import {
  getCrmCaseDashboardAction,
  listCrmCasesAction,
} from "@/modules/crm-case/actions/crm-case-actions";
import { CrmCaseDashboard } from "@/modules/crm-case/components/crm-case-dashboard";
import { CrmCaseListPanel } from "@/modules/crm-case/components/crm-case-list-panel";

type PageProps = { searchParams: Promise<{ view?: string }> };

export default async function CrmCasesPage({ searchParams }: PageProps) {
  const params = await searchParams;

  if (params.view) {
    const listResult = await listCrmCasesAction({ view: params.view });
    if (!listResult.success) {
      if (
        listResult.error.code === "SESSION_REQUIRED" ||
        listResult.error.code === "BUSINESS_CONTEXT_REQUIRED"
      ) {
        redirect("/select-business");
      }
      return (
        <main className="mx-auto max-w-3xl px-4 py-8">
          <h1 className="text-xl font-semibold">Cases</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {listResult.error.message}
          </p>
        </main>
      );
    }
    return <CrmCaseListPanel cases={listResult.data} activeView={params.view} />;
  }

  const result = await getCrmCaseDashboardAction();
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Cases</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return <CrmCaseDashboard data={result.data} />;
}
