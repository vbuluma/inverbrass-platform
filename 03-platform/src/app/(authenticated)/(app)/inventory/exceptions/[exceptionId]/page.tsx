import { redirect } from "next/navigation";

import { getInventoryExceptionAction } from "@/modules/inventory/actions/inventory-ops-incident-actions";
import { InventoryExceptionDetail } from "@/modules/inventory/components/inventory-exception-detail";

type ExceptionDetailPageProps = {
  params: Promise<{ exceptionId: string }>;
};

export default async function InventoryExceptionDetailPage({
  params,
}: ExceptionDetailPageProps) {
  const { exceptionId } = await params;
  const result = await getInventoryExceptionAction(exceptionId);
  if (!result.success) {
    redirect("/inventory/exceptions");
  }
  return <InventoryExceptionDetail exception={result.data} />;
}
