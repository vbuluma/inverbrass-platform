import { redirect } from "next/navigation";

import { getCrmVisitAction } from "@/modules/crm-visit/actions/crm-visit-actions";
import { CrmVisitWorkspace } from "@/modules/crm-visit/components/crm-visit-workspace";

type PageProps = { params: Promise<{ visitId: string }> };

export default async function CrmVisitDetailPage({ params }: PageProps) {
  const { visitId } = await params;
  const result = await getCrmVisitAction(visitId);

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Visit</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return <CrmVisitWorkspace visit={result.data} />;
}
