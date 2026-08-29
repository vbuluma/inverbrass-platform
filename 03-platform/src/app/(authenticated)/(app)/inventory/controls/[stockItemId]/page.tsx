import { redirect } from "next/navigation";

import { getStockItemAction, listLocationsAction } from "@/modules/inventory/actions/inventory-actions";
import { getInventoryControlsAction } from "@/modules/inventory/actions/inventory-control-actions";
import { InventoryControlSettingsForm } from "@/modules/inventory/components/inventory-control-settings-form";

type ControlSettingsPageProps = {
  params: Promise<{ stockItemId: string }>;
  searchParams: Promise<{ location?: string }>;
};

export default async function InventoryControlSettingsPage({
  params,
  searchParams,
}: ControlSettingsPageProps) {
  const { stockItemId } = await params;
  const query = await searchParams;
  const [item, controls, locations] = await Promise.all([
    getStockItemAction(stockItemId),
    getInventoryControlsAction({ stockItemId }),
    listLocationsAction(),
  ]);
  if (!item.success || !controls.success || !locations.success) {
    redirect("/inventory/controls");
  }
  return (
    <InventoryControlSettingsForm
      item={item.data}
      locations={locations.data}
      positions={controls.data.rows}
      pendingChanges={controls.data.pendingChanges.filter((row) => row.stockItemId === stockItemId)}
      selectedLocationId={query.location ?? ""}
    />
  );
}
