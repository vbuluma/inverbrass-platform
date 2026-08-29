import { redirect } from "next/navigation";

import { listReservationsAction } from "@/modules/inventory/actions/inventory-reservation-actions";
import { ReservationList } from "@/modules/inventory/components/reservation-list";

export default async function InventoryReservationsPage() {
  const result = await listReservationsAction();
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/inventory");
  }
  return <ReservationList reservations={result.data} />;
}
