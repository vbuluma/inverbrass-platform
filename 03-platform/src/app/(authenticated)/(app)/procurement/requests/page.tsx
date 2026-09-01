import { redirect } from "next/navigation";

import { listPurchaseRequestsAction } from "@/modules/procurement/actions/purchase-request-actions";
import { PurchaseRequestList } from "@/modules/procurement/components/purchase-request-list";
import type { PurchaseRequestListFilter } from "@/modules/procurement/types";

type PurchaseRequestsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function PurchaseRequestsPage({ searchParams }: PurchaseRequestsPageProps) {
  const params = await searchParams;
  const status = (params.status as PurchaseRequestListFilter["status"]) ?? "all";
  const result = await listPurchaseRequestsAction({ status });
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/procurement");
  }
  return <PurchaseRequestList initialRows={result.data} initialStatus={status} />;
}
