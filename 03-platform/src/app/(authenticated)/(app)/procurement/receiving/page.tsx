import { ReceivingList } from "@/modules/procurement/components/receiving-list";
import { createReceivingService } from "@/modules/procurement/services/receiving-service";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { ALL_PROCUREMENT_PERMISSIONS } from "@/modules/procurement/constants";

export default async function ReceivingPage() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();
  const rows =
    user && context
      ? await createReceivingService().list(context, {
          userId: user.platformUserId,
          permissions: ALL_PROCUREMENT_PERMISSIONS,
        })
      : [];
  return <ReceivingList initialRows={rows} />;
}
