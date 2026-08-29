import { redirect } from "next/navigation";

import { listLocationsAction, listStockItemsAction } from "@/modules/inventory/actions/inventory-actions";
import { searchTraceabilityAction } from "@/modules/inventory/actions/inventory-traceability-actions";
import { InventoryTraceabilityWorkspace } from "@/modules/inventory/components/inventory-traceability-workspace";

type TraceabilityPageProps = {
  searchParams: Promise<{
    item?: string;
    lot?: string;
    serial?: string;
    location?: string;
    expiry?: string;
  }>;
};

export default async function InventoryTraceabilityPage({ searchParams }: TraceabilityPageProps) {
  const params = await searchParams;
  const [search, items, locations] = await Promise.all([
    searchTraceabilityAction({
      stockItemId: params.item || null,
      lotCode: params.lot || null,
      unitCode: params.serial || null,
      locationId: params.location || null,
      expiryStatus: params.expiry || null,
    }),
    listStockItemsAction(),
    listLocationsAction(),
  ]);
  if (!search.success || !items.success || !locations.success) {
    redirect("/inventory");
  }
  return (
    <InventoryTraceabilityWorkspace
      lots={search.data.lots}
      units={search.data.units}
      stockItems={items.data}
      locations={locations.data}
      query={{
        stockItemId: params.item ?? "",
        lotCode: params.lot ?? "",
        unitCode: params.serial ?? "",
        locationId: params.location ?? "",
        expiryStatus: params.expiry ?? "",
      }}
    />
  );
}
