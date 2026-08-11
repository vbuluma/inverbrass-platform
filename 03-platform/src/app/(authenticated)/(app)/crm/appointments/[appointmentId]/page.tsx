/**
 * BP-004 / IP-06 Appointment detail route.
 */

import { redirect } from "next/navigation";

import { getCrmAppointmentAction } from "@/modules/crm-appointment/actions/crm-appointment-actions";
import { CrmAppointmentWorkspace } from "@/modules/crm-appointment/components/crm-appointment-workspace";

type PageProps = {
  params: Promise<{ appointmentId: string }>;
};

export default async function CrmAppointmentDetailPage({ params }: PageProps) {
  const { appointmentId } = await params;
  const result = await getCrmAppointmentAction(appointmentId);

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Appointment</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return <CrmAppointmentWorkspace appointment={result.data} />;
}
