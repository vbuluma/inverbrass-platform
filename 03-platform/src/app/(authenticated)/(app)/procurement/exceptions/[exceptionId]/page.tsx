import { notFound } from "next/navigation";

import { ExceptionWorkspace } from "@/modules/procurement/components/exception-workspace";
import { createExceptionService } from "@/modules/procurement/services/exception-service";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { ProcurementError } from "@/modules/procurement";
import { resolveProcurementActor } from "@/modules/procurement/helpers/procurement-channel-context";
import type { ExceptionView } from "@/modules/procurement/types";

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

  let exception: ExceptionView;
  try {
    exception = await createExceptionService().get(
      context,
      await resolveProcurementActor(context),
      exceptionId
    );
  } catch (error) {
    if (error instanceof ProcurementError && error.code === "EXCEPTION_NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  return <ExceptionWorkspace exception={exception} currentUserId={user.platformUserId} />;
}
