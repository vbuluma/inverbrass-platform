import { notFound } from "next/navigation";

import { ExceptionWorkspace } from "@/modules/procurement/components/exception-workspace";
import { createExceptionService } from "@/modules/procurement/services/exception-service";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { ALL_PROCUREMENT_PERMISSIONS, ProcurementError } from "@/modules/procurement";

type ExceptionDetailPageProps = {
  params: Promise<{ exceptionId: string }>;
};

export default async function ExceptionDetailPage({ params }: ExceptionDetailPageProps) {
  const { exceptionId } = await params;
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();
  if (!user || !context) {
    notFound();
  }
  try {
    const exception = await createExceptionService().get(context, {
      userId: user.platformUserId,
      permissions: ALL_PROCUREMENT_PERMISSIONS,
    }, exceptionId);
    return <ExceptionWorkspace exception={exception} currentUserId={user.platformUserId} />;
  } catch (error) {
    if (error instanceof ProcurementError && error.code === "EXCEPTION_NOT_FOUND") {
      notFound();
    }
    throw error;
  }
}
