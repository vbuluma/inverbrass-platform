import { redirect } from "next/navigation";

import { listPurchaseRequestsAction } from "@/modules/procurement/actions/purchase-request-actions";
import { SourcingCreateForm } from "@/modules/procurement/components/sourcing-create-form";

type NewSourcingPageProps = {
  searchParams: Promise<{ requestId?: string }>;
};

export default async function NewSourcingPage({ searchParams }: NewSourcingPageProps) {
  const params = await searchParams;
  const result = await listPurchaseRequestsAction({ status: "approved" });
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/procurement/sourcing");
  }
  return (
    <SourcingCreateForm
      approvedRequests={result.data}
      presetRequestId={params.requestId ?? null}
    />
  );
}
