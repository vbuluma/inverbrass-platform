import { InvoiceList } from "@/modules/procurement/components/invoice-list";
import { createInvoiceService } from "@/modules/procurement/services/invoice-service";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { ALL_PROCUREMENT_PERMISSIONS } from "@/modules/procurement/constants";

export default async function InvoicesPage() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();
  const rows =
    user && context
      ? await createInvoiceService().list(context, {
          userId: user.platformUserId,
          permissions: ALL_PROCUREMENT_PERMISSIONS,
        })
      : [];
  return <InvoiceList initialRows={rows} />;
}
