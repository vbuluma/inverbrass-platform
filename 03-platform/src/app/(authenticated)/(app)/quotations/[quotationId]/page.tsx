import { redirect } from "next/navigation";

import { getQuotationAction } from "@/modules/crm/actions/quotation-actions";
import { CrmModuleErrorPage } from "@/modules/crm/components/crm-module-error-page";
import { QuotationWorkspace } from "@/modules/crm/components/quotation-workspace";

type PageProps = {
  params: Promise<{ quotationId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function QuotationWorkspacePage({
  params,
  searchParams,
}: PageProps) {
  const { quotationId } = await params;
  const { tab } = await searchParams;
  const result = await getQuotationAction(quotationId);

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    return <CrmModuleErrorPage message={result.error.message} />;
  }

  return <QuotationWorkspace initialData={result.data} initialTab={tab} />;
}
