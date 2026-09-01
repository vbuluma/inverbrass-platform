import { redirect } from "next/navigation";

import { listProcurementSuppliersAction } from "@/modules/procurement/actions/procurement-actions";
import { rankSuppliersForInvitationAction } from "@/modules/procurement/actions/performance-actions";
import { getEvaluationAction } from "@/modules/procurement/actions/sourcing-actions";
import { EvaluationOutcomeWorkspace } from "@/modules/procurement/components/evaluation-outcome-workspace";

type EvaluationPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function SourcingEventPage({ params }: EvaluationPageProps) {
  const { eventId } = await params;
  const result = await getEvaluationAction(eventId);
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/procurement/sourcing");
  }
  const suppliers = await listProcurementSuppliersAction({ status: "all" });
  const supplierRows = suppliers.success ? suppliers.data : [];
  const ranked = await rankSuppliersForInvitationAction(supplierRows.map((row) => row.id));
  const rankByProfile = new Map(
    ranked.success ? ranked.data.map((row) => [row.profileId, row.invitationRank]) : []
  );
  const sortedSuppliers = [...supplierRows].sort(
    (left, right) =>
      (rankByProfile.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (rankByProfile.get(right.id) ?? Number.MAX_SAFE_INTEGER)
  );
  return (
    <EvaluationOutcomeWorkspace
      initial={result.data}
      suppliers={sortedSuppliers}
      invitationRanks={Object.fromEntries(rankByProfile)}
    />
  );
}
