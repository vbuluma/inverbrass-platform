import { notFound } from "next/navigation";

import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { ALL_PROCUREMENT_PERMISSIONS } from "@/modules/procurement/constants";
import { ContractWorkspace } from "@/modules/procurement/components/contract-workspace";
import { createContractService } from "@/modules/procurement/services/contract-service";

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
  try {
    const view = await createContractService().get(context, {
      userId: user.platformUserId,
      permissions: ALL_PROCUREMENT_PERMISSIONS,
    }, contractId);
    return <ContractWorkspace initial={view} />;
  } catch {
    notFound();
  }
}
