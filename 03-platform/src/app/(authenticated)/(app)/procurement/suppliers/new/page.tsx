import { redirect } from "next/navigation";

import { getProcurementCataloguesAction } from "@/modules/procurement/actions/procurement-actions";
import { AddSupplierForm } from "@/modules/procurement/components/add-supplier-form";

export default async function AddProcurementSupplierPage() {
  const catalogues = await getProcurementCataloguesAction();
  if (!catalogues.success) {
    if (
      catalogues.error.code === "SESSION_REQUIRED" ||
      catalogues.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/procurement/suppliers");
  }
  return <AddSupplierForm catalogues={catalogues.data} />;
}
