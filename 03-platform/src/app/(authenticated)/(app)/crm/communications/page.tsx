import { redirect } from "next/navigation";

import {
  getCrmCommunicationDashboardAction,
  listCrmCommunicationsAction,
} from "@/modules/crm-communication/actions/crm-communication-actions";
import { CrmCommunicationDashboard } from "@/modules/crm-communication/components/crm-communication-dashboard";
import { CrmCommunicationListPanel } from "@/modules/crm-communication/components/crm-communication-list-panel";

type PageProps = { searchParams: Promise<{ view?: string }> };

export default async function CrmCommunicationsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  if (params.view) {
    const listResult = await listCrmCommunicationsAction({ view: params.view });
    if (!listResult.success) {
      if (
        listResult.error.code === "SESSION_REQUIRED" ||
        listResult.error.code === "BUSINESS_CONTEXT_REQUIRED"
      ) {
        redirect("/select-business");
      }
      return (
        <main className="mx-auto max-w-3xl px-4 py-8">
          <h1 className="text-xl font-semibold">Communications</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {listResult.error.message}
          </p>
        </main>
      );
    }
    return (
      <CrmCommunicationListPanel
        communications={listResult.data}
        activeView={params.view}
      />
    );
  }

  const result = await getCrmCommunicationDashboardAction();
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Communications</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return <CrmCommunicationDashboard data={result.data} />;
}
