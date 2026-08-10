/**
 * BP-004 / IP-06 Calendar dashboard and list route.
 */

import { redirect } from "next/navigation";

import {
  getCrmAppointmentDashboardAction,
  listCrmAppointmentsAction,
} from "@/modules/crm-appointment/actions/crm-appointment-actions";
import { CrmAppointmentDashboard } from "@/modules/crm-appointment/components/crm-appointment-dashboard";
import { CrmAppointmentListPanel } from "@/modules/crm-appointment/components/crm-appointment-list-panel";

type PageProps = {
  searchParams: Promise<{ view?: string }>;
};

export default async function CrmAppointmentsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  if (params.view) {
    const listResult = await listCrmAppointmentsAction({ view: params.view });

    if (!listResult.success) {
      if (
        listResult.error.code === "SESSION_REQUIRED" ||
        listResult.error.code === "BUSINESS_CONTEXT_REQUIRED"
      ) {
        redirect("/select-business");
      }

      return (
        <main className="mx-auto max-w-3xl px-4 py-8">
          <h1 className="text-xl font-semibold">Appointments</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {listResult.error.message}
          </p>
        </main>
      );
    }

    return (
      <CrmAppointmentListPanel
        appointments={listResult.data}
        activeView={params.view}
      />
    );
  }

  const result = await getCrmAppointmentDashboardAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Appointments</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return <CrmAppointmentDashboard data={result.data} />;
}
