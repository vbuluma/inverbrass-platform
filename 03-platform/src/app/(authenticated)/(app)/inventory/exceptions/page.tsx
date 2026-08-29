import { redirect } from "next/navigation";

import { listLocationsAction, listStockItemsAction } from "@/modules/inventory/actions/inventory-actions";
import {
  listInventoryExceptionTypesAction,
  listInventoryExceptionsAction,
} from "@/modules/inventory/actions/inventory-ops-incident-actions";
import { InventoryExceptionWorkspace } from "@/modules/inventory/components/inventory-exception-workspace";

type ExceptionsPageProps = {
  searchParams: Promise<{
    status?: string;
    type?: string;
    severity?: string;
    item?: string;
    location?: string;
  }>;
};

export default async function InventoryExceptionsPage({ searchParams }: ExceptionsPageProps) {
  const params = await searchParams;
  const [exceptions, types, items, locations] = await Promise.all([
    listInventoryExceptionsAction({
      status: params.status || null,
      incidentType: params.type || null,
      severity: params.severity || null,
      stockItemId: params.item || null,
      locationId: params.location || null,
    }),
    listInventoryExceptionTypesAction(),
    listStockItemsAction(),
    listLocationsAction(),
  ]);
  if (!exceptions.success || !types.success || !items.success || !locations.success) {
    if (
      (!exceptions.success &&
        (exceptions.error.code === "SESSION_REQUIRED" ||
          exceptions.error.code === "BUSINESS_CONTEXT_REQUIRED")) ||
      (!types.success &&
        (types.error.code === "SESSION_REQUIRED" ||
          types.error.code === "BUSINESS_CONTEXT_REQUIRED"))
    ) {
      redirect("/select-business");
    }
    redirect("/inventory");
  }
  return (
    <InventoryExceptionWorkspace
      rows={exceptions.data}
      types={types.data}
      stockItems={items.data}
      locations={locations.data}
      query={{
        status: params.status ?? "",
        incidentType: params.type ?? "",
        severity: params.severity ?? "",
        stockItemId: params.item ?? "",
        locationId: params.location ?? "",
      }}
    />
  );
}
