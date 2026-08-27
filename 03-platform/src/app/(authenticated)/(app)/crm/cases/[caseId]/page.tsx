import { redirect } from "next/navigation";

import {
  getCrmCaseAction,
  getCrmCaseRegistrationCataloguesAction,
} from "@/modules/crm-case/actions/crm-case-actions";
import { CrmCaseWorkspace } from "@/modules/crm-case/components/crm-case-workspace";

type PageProps = { params: Promise<{ caseId: string }> };

export default async function CrmCaseDetailPage({ params }: PageProps) {
  const { caseId } = await params;
  const [result, cataloguesResult] = await Promise.all([
    getCrmCaseAction(caseId),
    getCrmCaseRegistrationCataloguesAction(),
  ]);

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Case</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return (
    <CrmCaseWorkspace
      caseDetail={result.data}
      owners={cataloguesResult.success ? cataloguesResult.data.owners : []}
      resolutionCodes={
        cataloguesResult.success ? cataloguesResult.data.resolutionCodes : []
      }
    />
  );
}
