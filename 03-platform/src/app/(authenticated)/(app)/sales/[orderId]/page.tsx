import { notFound, redirect } from "next/navigation";

import { getSalesOrderAction } from "@/modules/sales/actions/sales-order-actions";
import { SalesOrderWorkspace } from "@/modules/sales/components/sales-order-workspace";

type PageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function SalesOrderPage({ params }: PageProps) {
  const { orderId } = await params;
  const result = await getSalesOrderAction(orderId);
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    notFound();
  }
  return <SalesOrderWorkspace initialOrder={result.data} />;
}
