import { notFound } from "next/navigation";

import { InvoiceWorkspace } from "@/modules/procurement/components/invoice-workspace";
import { createInvoiceService } from "@/modules/procurement/services/invoice-service";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { resolveProcurementActor } from "@/modules/procurement/helpers/procurement-channel-context";
import type { InvoiceView } from "@/modules/procurement/types";

type InvoicePageProps = {
  params: Promise<{ invoiceId: string }>;
};

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { invoiceId } = await params;
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();
  if (!user || !context) {
    notFound();
  }

  let invoice: InvoiceView;
  try {
    invoice = await createInvoiceService().get(
      context,
      await resolveProcurementActor(context),
      invoiceId
    );
  } catch {
    notFound();
  }

  return <InvoiceWorkspace invoice={invoice} />;
}
