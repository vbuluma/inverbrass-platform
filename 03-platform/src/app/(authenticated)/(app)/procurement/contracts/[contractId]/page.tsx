import { notFound } from "next/navigation";

import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { ContractWorkspace } from "@/modules/procurement/components/contract-workspace";
import { resolveProcurementActor } from "@/modules/procurement/helpers/procurement-channel-context";
import { createContractService } from "@/modules/procurement/services/contract-service";
import type { ContractView } from "@/modules/procurement/types";

type ContractDetailPageProps = {
  params: Promise<{ contractId: string }>;
};

export default async function ContractDetailPage({ params }: ContractDetailPageProps) {
  const { contractId } = await params;
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();
  if (!user || !context) {
    notFound();
  }

  let view: ContractView;
  try {
    view = await createContractService().get(
      context,
      await resolveProcurementActor(context),
      contractId
    );
  } catch {
    notFound();
  }

  return <ContractWorkspace initial={view} />;
}
