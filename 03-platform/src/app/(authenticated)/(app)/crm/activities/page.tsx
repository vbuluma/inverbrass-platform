/**
 * BP-004 / IP-05 Activity dashboard and list route.
 */

import { redirect } from "next/navigation";

import {
  getCrmActivityDashboardAction,
  listCrmActivitiesAction,
} from "@/modules/crm-activity/actions/crm-activity-actions";
import { CrmActivityDashboard } from "@/modules/crm-activity/components/crm-activity-dashboard";
import { CrmActivityListPanel } from "@/modules/crm-activity/components/crm-activity-list-panel";

type PageProps = {
  searchParams: Promise<{ view?: string }>;
};

export default async function CrmActivitiesPage({ searchParams }: PageProps) {
  const params = await searchParams;

  if (params.view) {
    const listResult = await listCrmActivitiesAction({ view: params.view });

    if (!listResult.success) {
      if (
        listResult.error.code === "SESSION_REQUIRED" ||
        listResult.error.code === "BUSINESS_CONTEXT_REQUIRED"
      ) {
        redirect("/select-business");
      }

      return (
        <main className="mx-auto max-w-3xl px-4 py-8">
          <h1 className="text-xl font-semibold">Activities</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {listResult.error.message}
          </p>
        </main>
      );
    }

    return (
      <CrmActivityListPanel
        activities={listResult.data}
        activeView={params.view}
      />
    );
  }

  const result = await getCrmActivityDashboardAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Activities</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return <CrmActivityDashboard data={result.data} />;
}
