/**
 * Purpose:
 * Start Business Registration: Industry Solution → Business Template → Create.
 *
 * Design rationale:
 * Prefills proposed business name from Platform Registration. Templates are
 * loaded for all industries and filtered client-side by selected industry.
 *
 * Why this exists:
 * BP-001 foundation correction — Business Registration is separate from signup.
 */

import { redirect } from "next/navigation";

import { CreateBusinessForm } from "@/app/(authenticated)/businesses/create/create-business-form";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import {
  getBusinessTypesAction,
  getCountriesAction,
  getIndustriesAction,
} from "@/core/auth/actions/catalog-actions";
import { createAuthService } from "@/core/auth/services/auth-service";

export default async function CreateBusinessPage() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.mustChangePassword) {
    redirect("/first-login");
  }

  const [industriesResult, templatesResult, countriesResult] =
    await Promise.all([
      getIndustriesAction(),
      getBusinessTypesAction(),
      getCountriesAction(),
    ]);

  const industries = industriesResult.success ? industriesResult.data : [];
  const templates = templatesResult.success ? templatesResult.data : [];
  const countries = countriesResult.success ? countriesResult.data : [];

  const defaultCountryCode = countries[0]?.code ?? "KE";

  return (
    <AuthPageShell
      title="Create Business"
      description="Enter business name, Industry Solution, Business Template, and country. Currency and remaining setup continue in the Business Setup Wizard."
      className="max-w-lg"
    >
      <CreateBusinessForm
        industries={industries}
        templates={templates}
        countries={countries}
        defaultBusinessName={user.proposedBusinessName ?? ""}
        defaultCountryCode={defaultCountryCode}
        defaultMobileNumber={user.phoneNumber}
      />
    </AuthPageShell>
  );
}
