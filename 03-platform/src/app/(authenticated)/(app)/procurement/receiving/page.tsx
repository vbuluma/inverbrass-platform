import { ReceivingList } from "@/modules/procurement/components/receiving-list";
import { createReceivingService } from "@/modules/procurement/services/receiving-service";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { resolveProcurementActor } from "@/modules/procurement/helpers/procurement-channel-context";

export default async function ReceivingPage() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();
  const rows =
    user && context
      ? await createReceivingService().list(
          context,
          await resolveProcurementActor(context)
        )
      : [];
  return <ReceivingList initialRows={rows} />;
}
