import { notFound } from "next/navigation";

import { InvoiceWorkspace } from "@/modules/procurement/components/invoice-workspace";
import { createInvoiceService } from "@/modules/procurement/services/invoice-service";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { ALL_PROCUREMENT_PERMISSIONS } from "@/modules/procurement/constants";

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
  try {
    const invoice = await createInvoiceService().get(context, {
      userId: user.platformUserId,
      permissions: ALL_PROCUREMENT_PERMISSIONS,
    }, invoiceId);
    return <InvoiceWorkspace invoice={invoice} />;
  } catch {
    notFound();
  }
}
