import { redirect } from "next/navigation";

import { getInventoryDashboardAction } from "@/modules/inventory/actions/inventory-actions";
import {
  listAvailabilityWithTransitAction,
  summarizeTransfersAction,
} from "@/modules/inventory/actions/inventory-transfer-actions";
import { InventoryWorkspace } from "@/modules/inventory/components/inventory-workspace";

function sumQuantities(values: string[]) {
  return values.reduce((total, value) => {
    const next = Number(value);
    const current = Number(total);
    if (Number.isNaN(next) || Number.isNaN(current)) {
      return total;
    }
    return String(current + next);
  }, "0");
}

export default async function InventoryPage() {
  const result = await getInventoryDashboardAction();
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/dashboard");
  }
  const [availability, transfers] = await Promise.all([
    listAvailabilityWithTransitAction(),
    summarizeTransfersAction(),
  ]);
  const stockTotals = availability.success
    ? {
        onHand: sumQuantities(availability.data.map((row) => row.onHand)),
        available: sumQuantities(availability.data.map((row) => row.available)),
        reserved: sumQuantities(availability.data.map((row) => row.reserved)),
      }
    : undefined;
  return (
    <InventoryWorkspace
      data={result.data}
      transferSummary={transfers.success ? transfers.data : undefined}
      stockTotals={stockTotals}
    />
  );
}
