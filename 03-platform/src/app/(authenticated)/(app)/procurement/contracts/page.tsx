import { ContractList } from "@/modules/procurement/components/contract-list";
import { createContractService } from "@/modules/procurement/services/contract-service";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { resolveProcurementActor } from "@/modules/procurement/helpers/procurement-channel-context";

export default async function ContractsPage() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();
  const rows =
    user && context
      ? await createContractService().list(
          context,
          await resolveProcurementActor(context)
        )
      : [];
  return <ContractList initialRows={rows} />;
}
