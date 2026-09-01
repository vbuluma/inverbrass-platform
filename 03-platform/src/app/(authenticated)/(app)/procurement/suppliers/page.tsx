import { redirect } from "next/navigation";

import { listProcurementSuppliersAction } from "@/modules/procurement/actions/procurement-actions";
import { SupplierList } from "@/modules/procurement/components/supplier-list";

export default async function ProcurementSuppliersPage() {
  const result = await listProcurementSuppliersAction({ status: "all" });
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/procurement");
  }
  return <SupplierList initialRows={result.data} />;
}
