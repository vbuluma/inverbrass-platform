import { redirect } from "next/navigation";

import { listOpeningBalancesAction } from "@/modules/inventory/actions/inventory-inbound-actions";
import { OpeningBalanceList } from "@/modules/inventory/components/opening-balance-list";

export default async function OpeningBalancesPage() {
  const result = await listOpeningBalancesAction();
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/inventory");
  }
  return <OpeningBalanceList documents={result.data} />;
}
