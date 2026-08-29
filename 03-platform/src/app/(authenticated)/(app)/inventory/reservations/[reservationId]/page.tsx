import { redirect } from "next/navigation";

import { getReservationAction } from "@/modules/inventory/actions/inventory-reservation-actions";
import { ReservationDetail } from "@/modules/inventory/components/reservation-detail";

type ReservationDetailPageProps = {
  params: Promise<{ reservationId: string }>;
};

export default async function InventoryReservationDetailPage({
  params,
}: ReservationDetailPageProps) {
  const { reservationId } = await params;
  const result = await getReservationAction(reservationId);
  if (!result.success) {
    redirect("/inventory/reservations");
  }
  return <ReservationDetail reservation={result.data} />;
}
