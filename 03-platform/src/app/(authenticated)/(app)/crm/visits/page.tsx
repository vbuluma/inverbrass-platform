import { redirect } from "next/navigation";

import {
  getCrmVisitDashboardAction,
  listCrmVisitsAction,
} from "@/modules/crm-visit/actions/crm-visit-actions";
import { CrmVisitDashboard } from "@/modules/crm-visit/components/crm-visit-dashboard";
import { CrmVisitListPanel } from "@/modules/crm-visit/components/crm-visit-list-panel";

type PageProps = { searchParams: Promise<{ view?: string }> };

export default async function CrmVisitsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  if (params.view) {
    const listResult = await listCrmVisitsAction({ view: params.view });
    if (!listResult.success) {
      if (
        listResult.error.code === "SESSION_REQUIRED" ||
        listResult.error.code === "BUSINESS_CONTEXT_REQUIRED"
      ) {
        redirect("/select-business");
      }
      return (
        <main className="mx-auto max-w-3xl px-4 py-8">
          <h1 className="text-xl font-semibold">Visits</h1>
          <p className="mt-2 text-sm text-muted-foreground">{listResult.error.message}</p>
        </main>
      );
    }
    return <CrmVisitListPanel visits={listResult.data} activeView={params.view} />;
  }

  const result = await getCrmVisitDashboardAction();
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Visits</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return <CrmVisitDashboard data={result.data} />;
}
