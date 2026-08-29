import { redirect } from "next/navigation";

import { listLocationsAction, listStockItemsAction } from "@/modules/inventory/actions/inventory-actions";
import { getInventoryControlsAction } from "@/modules/inventory/actions/inventory-control-actions";
import { InventoryControlWorkspace } from "@/modules/inventory/components/inventory-control-workspace";

type ControlsPageProps = {
  searchParams: Promise<{
    item?: string;
    location?: string;
    status?: string;
  }>;
};

export default async function InventoryControlsPage({ searchParams }: ControlsPageProps) {
  const params = await searchParams;
  const [controls, items, locations] = await Promise.all([
    getInventoryControlsAction({
      stockItemId: params.item || null,
      locationId: params.location || null,
      status: params.status || null,
    }),
    listStockItemsAction(),
    listLocationsAction(),
  ]);
  if (!controls.success || !items.success || !locations.success) {
    redirect("/inventory");
  }
  return (
    <InventoryControlWorkspace
      data={controls.data}
      stockItems={items.data}
      locations={locations.data}
      query={{
        stockItemId: params.item ?? "",
        locationId: params.location ?? "",
        status: params.status ?? "",
      }}
    />
  );
}
