import { redirect } from "next/navigation";

import { CommercialGovernanceWorkspace } from "@/modules/commercial/components/commercial-governance-workspace";
import { loadCommercialGovernanceWorkspaceAction } from "@/modules/commercial/actions/commercial-governance-actions";

export default async function CommercialGovernancePage() {
  const result = await loadCommercialGovernanceWorkspaceAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_MISMATCH"
    ) {
      redirect("/select-business");
    }
  }

  return <CommercialGovernanceWorkspace />;
}
