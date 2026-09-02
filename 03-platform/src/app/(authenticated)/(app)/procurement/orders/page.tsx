import { redirect } from "next/navigation";

import { listPurchaseOrdersAction } from "@/modules/procurement/actions/purchase-order-actions";
import { PurchaseOrderList } from "@/modules/procurement/components/purchase-order-list";
import type { PurchaseOrderListFilter } from "@/modules/procurement/types";

type PurchaseOrdersPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function PurchaseOrdersPage({ searchParams }: PurchaseOrdersPageProps) {
  const params = await searchParams;
  const status = (params.status as PurchaseOrderListFilter["status"]) ?? "all";
  const result = await listPurchaseOrdersAction({ status });
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/procurement");
  }
  return <PurchaseOrderList initialRows={result.data} initialStatus={status} />;
}
