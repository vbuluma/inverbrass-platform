import { ExceptionCreateForm } from "@/modules/procurement/components/exception-create-form";
import { createExceptionService } from "@/modules/procurement/services/exception-service";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { ALL_PROCUREMENT_PERMISSIONS } from "@/modules/procurement/constants";

export default async function NewExceptionPage() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();
  const types =
    user && context
      ? await createExceptionService().listTypes(context, {
          userId: user.platformUserId,
          permissions: ALL_PROCUREMENT_PERMISSIONS,
        })
      : [];
  return <ExceptionCreateForm types={types} />;
}
