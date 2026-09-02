import { PaymentReadyList } from "@/modules/procurement/components/payment-ready-list";
import { createInvoiceService } from "@/modules/procurement/services/invoice-service";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { resolveProcurementActor } from "@/modules/procurement/helpers/procurement-channel-context";

export default async function PaymentReadyPage() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();
  const rows =
    user && context
      ? await createInvoiceService().listPaymentReady(
          context,
          await resolveProcurementActor(context)
        )
      : [];
  return <PaymentReadyList initialRows={rows} />;
}
