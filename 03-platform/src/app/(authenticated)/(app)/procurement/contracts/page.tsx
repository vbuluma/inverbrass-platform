import { ContractList } from "@/modules/procurement/components/contract-list";
import { createContractService } from "@/modules/procurement/services/contract-service";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { ALL_PROCUREMENT_PERMISSIONS } from "@/modules/procurement/constants";

export default async function ContractsPage() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();
  const rows =
    user && context
      ? await createContractService().list(context, {
          userId: user.platformUserId,
          permissions: ALL_PROCUREMENT_PERMISSIONS,
        })
      : [];
  return <ContractList initialRows={rows} />;
}
