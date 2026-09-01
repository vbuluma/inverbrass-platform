import { ExceptionList } from "@/modules/procurement/components/exception-list";
import { createExceptionService } from "@/modules/procurement/services/exception-service";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { ALL_PROCUREMENT_PERMISSIONS } from "@/modules/procurement/constants";
import type { ExceptionListFilter } from "@/modules/procurement/types";

type ExceptionsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function ExceptionsPage({ searchParams }: ExceptionsPageProps) {
  const params = await searchParams;
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();
  const filter: ExceptionListFilter = {
    status:
      params.status === "mine" ||
      params.status === "overdue" ||
      params.status === "pending-approval"
        ? params.status
        : "open",
  };
  const rows =
    user && context
      ? await createExceptionService().list(context, {
          userId: user.platformUserId,
          permissions: ALL_PROCUREMENT_PERMISSIONS,
        }, filter)
      : [];
  return <ExceptionList initialRows={rows} filter={params.status} />;
}
