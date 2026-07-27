/**
 * Purpose:
 * Start Business Registration: Industry Type → Business Template → Create.
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
import { inferCountryCodeFromE164 } from "@/core/auth/utils/phone-normalizer";

export default async function CreateBusinessPage() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  if (user.mustChangePassword) {
    redirect("/first-login");
  }

  // Sequential catalogue reads — session pooler max:1.
  const industriesResult = await getIndustriesAction();
  const templatesResult = await getBusinessTypesAction();
  const countriesResult = await getCountriesAction();

  const industries = industriesResult.success ? industriesResult.data : [];
  const templates = templatesResult.success ? templatesResult.data : [];
  const countries = countriesResult.success ? countriesResult.data : [];

  // Prefill from Platform Registration country (inferred from stored E.164 mobile).
  const registrationCountry =
    inferCountryCodeFromE164(user.phoneNumber) ??
    countries[0]?.code ??
    "KE";
  const defaultCountryCode = countries.some(
    (country) => country.code === registrationCountry
  )
    ? registrationCountry
    : (countries[0]?.code ?? "KE");

  return (
    <AuthPageShell
      title="Create Business"
      description="Country is prefilled from Platform Registration. Base currency is derived in setup from the selected country."
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
