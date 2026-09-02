import { redirect } from "next/navigation";

import { getProcurementLifecycleAction } from "@/modules/procurement/actions/procurement-analytics-actions";
import { ProcurementLifecycleWorkspace } from "@/modules/procurement/components/procurement-lifecycle-workspace";

type LifecyclePageProps = {
  params: Promise<{ anchorType: string; anchorId: string }>;
};

export default async function ProcurementLifecyclePage({ params }: LifecyclePageProps) {
  const { anchorType, anchorId } = await params;
  const result = await getProcurementLifecycleAction(anchorType, anchorId);
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/procurement/analytics");
  }
  return <ProcurementLifecycleWorkspace data={result.data} />;
}
