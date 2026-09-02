import { redirect } from "next/navigation";

import { listProcurementSuppliersAction } from "@/modules/procurement/actions/procurement-actions";
import { PurchaseRequestCreateForm } from "@/modules/procurement/components/purchase-request-create-form";

export default async function NewPurchaseRequestPage() {
  const suppliers = await listProcurementSuppliersAction({ status: "all" });
  if (
    !suppliers.success &&
    (suppliers.error.code === "SESSION_REQUIRED" ||
      suppliers.error.code === "BUSINESS_CONTEXT_REQUIRED")
  ) {
    redirect("/select-business");
  }
  return (
    <PurchaseRequestCreateForm suppliers={suppliers.success ? suppliers.data : []} />
  );
}
