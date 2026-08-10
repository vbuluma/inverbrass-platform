import { redirect } from "next/navigation";

import { getCrmCommunicationAction } from "@/modules/crm-communication/actions/crm-communication-actions";
import { CrmCommunicationWorkspace } from "@/modules/crm-communication/components/crm-communication-workspace";

type PageProps = { params: Promise<{ communicationId: string }> };

export default async function CrmCommunicationDetailPage({ params }: PageProps) {
  const { communicationId } = await params;
  const result = await getCrmCommunicationAction(communicationId);

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Communication</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return <CrmCommunicationWorkspace communication={result.data} />;
}
