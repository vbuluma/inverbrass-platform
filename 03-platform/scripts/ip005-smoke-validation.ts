/**
 * Purpose:
 * Smoke-validate BP-001 Platform Registration, Platform Home, and auth UI.
 *
 * Design rationale:
 * Confirms structural completeness and validator behaviour for the foundation
 * correction without mutating live data.
 *
 * Why this exists:
 * BP-001 foundation alignment — Platform Registration no longer creates businesses.
 *
 * Usage:
 *   npx tsx scripts/ip005-smoke-validation.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  recoveryCompletionSchema,
  recoveryInitiationSchema,
} from "@/core/auth/validators/recovery-validators";
import { ownerRegistrationUiSchema } from "@/core/auth/validators/registration-ui-validators";
import { createBusinessSchema } from "@/core/auth/validators/create-business-validators";
import { createPasswordRecoveryService } from "@/core/auth/services/password-recovery-service";
import { createReferenceDataService } from "@/core/auth/services/reference-data-service";
import {
  evaluatePasswordStrength,
  getPasswordMatchState,
  isPasswordPolicySatisfied,
} from "@/core/auth/utils/password-strength";
import { hashPassword, verifyPassword } from "@/core/auth/utils/password-hasher";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { createAdminClient } from "@/lib/supabase/admin";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "src/app/(public)/login/page.tsx",
  "src/app/(public)/login/login-form.tsx",
  "src/app/(public)/register/page.tsx",
  "src/app/(public)/register/register-form.tsx",
  "src/app/(public)/forgot-password/page.tsx",
  "src/app/(authenticated)/home/page.tsx",
  "src/app/(authenticated)/home/platform-home-business-list.tsx",
  "src/app/(authenticated)/businesses/create/page.tsx",
  "src/app/(authenticated)/businesses/create/create-business-form.tsx",
  "src/app/(authenticated)/profile/page.tsx",
  "src/app/(authenticated)/profile/notifications/page.tsx",
  "src/app/(authenticated)/security/page.tsx",
  "src/app/(authenticated)/account/page.tsx",
  "src/app/(authenticated)/select-business/page.tsx",
  "src/core/auth/services/onboarding-service.ts",
  "src/core/auth/services/business-registration-service.ts",
  "src/core/auth/services/password-recovery-service.ts",
  "src/core/auth/services/reference-data-service.ts",
  "src/core/auth/actions/onboarding-actions.ts",
  "src/core/auth/actions/business-registration-actions.ts",
  "src/core/auth/actions/auth-actions.ts",
  "src/core/auth/actions/select-business-actions.ts",
  "src/core/auth/actions/catalog-actions.ts",
  "next.config.ts",
  "src/core/auth/validators/registration-ui-validators.ts",
  "src/core/auth/validators/create-business-validators.ts",
  "src/core/auth/utils/password-strength.ts",
  "src/core/auth/utils/password-hasher.ts",
  "src/core/auth/utils/next-redirect.ts",
  "src/core/auth/utils/registration-ui-mapper.ts",
  "src/core/auth/services/credential-service.ts",
  "src/core/auth/session/auth-session-cookie.ts",
  "drizzle/0006_bp001_platform_registration.sql",
  "drizzle/0007_bp001_platform_auth.sql",
] as const;

type CheckResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

function checkRequiredFiles(): CheckResult[] {
  return REQUIRED_FILES.map((relativePath) => {
    const absolutePath = path.join(ROOT, relativePath);
    const ok = existsSync(absolutePath);

    return {
      name: `file:${relativePath}`,
      ok,
      detail: ok ? undefined : "missing",
    };
  });
}

function checkPlatformRegistrationValidators(): CheckResult[] {
  const success = ownerRegistrationUiSchema.safeParse({
    businessName: "Vincent Motors",
    countryCode: "KE",
    mobileNumber: "712345678",
    password: "Secure1!",
    confirmPassword: "Secure1!",
    securityQuestionId: "00000000-0000-4000-8000-000000000002",
    securityAnswer: "Nairobi",
  });

  const successWithOptionals = ownerRegistrationUiSchema.safeParse({
    businessName: "InverBrass Demo",
    countryCode: "KE",
    mobileNumber: "712345678",
    email: "owner@example.com",
    password: "Secure1!",
    confirmPassword: "Secure1!",
    securityQuestionId: "00000000-0000-4000-8000-000000000002",
    securityAnswer: "Nairobi",
  });

  const optionalEmailEmpty = ownerRegistrationUiSchema.safeParse({
    businessName: "Vincent Motors",
    countryCode: "KE",
    mobileNumber: "712345678",
    email: "",
    password: "Secure1!",
    confirmPassword: "Secure1!",
    securityQuestionId: "00000000-0000-4000-8000-000000000002",
    securityAnswer: "Nairobi",
  });

  const missingBusinessName = ownerRegistrationUiSchema.safeParse({
    businessName: "",
    countryCode: "KE",
    mobileNumber: "712345678",
    password: "Secure1!",
    confirmPassword: "Secure1!",
    securityQuestionId: "00000000-0000-4000-8000-000000000002",
    securityAnswer: "Nairobi",
  });

  const passwordMismatch = ownerRegistrationUiSchema.safeParse({
    businessName: "Vincent Motors",
    countryCode: "KE",
    mobileNumber: "712345678",
    password: "Secure1!",
    confirmPassword: "Secure2!",
    securityQuestionId: "00000000-0000-4000-8000-000000000002",
    securityAnswer: "Nairobi",
  });

  return [
    {
      name: "validator:platformRegistrationSuccessWithoutEmail",
      ok: success.success,
      detail: success.success
        ? undefined
        : success.error.issues[0]?.message,
    },
    {
      name: "validator:platformRegistrationSuccessWithOptionals",
      ok: successWithOptionals.success,
    },
    {
      name: "validator:platformRegistrationOptionalEmailEmpty",
      ok: optionalEmailEmpty.success,
    },
    {
      name: "validator:platformRegistrationRequiresBusinessName",
      ok: !missingBusinessName.success,
    },
    {
      name: "validator:platformRegistrationFailurePasswordMismatch",
      ok: !passwordMismatch.success,
    },
  ];
}

function checkBusinessCreationValidators(): CheckResult[] {
  const success = createBusinessSchema.safeParse({
    businessName: "InverBrass Retail",
    industryId: "00000000-0000-4000-8000-000000000010",
    businessTypeId: "00000000-0000-4000-8000-000000000011",
    countryCode: "KE",
  });

  const missingIndustry = createBusinessSchema.safeParse({
    businessName: "InverBrass Retail",
    industryId: "",
    businessTypeId: "00000000-0000-4000-8000-000000000011",
    countryCode: "KE",
  });

  return [
    {
      name: "validator:businessCreationSuccess",
      ok: success.success,
    },
    {
      name: "validator:businessCreationRequiresIndustry",
      ok: !missingIndustry.success,
    },
  ];
}

async function checkPasswordUx(): Promise<CheckResult[]> {
  const weak = evaluatePasswordStrength("abc");
  const strong = evaluatePasswordStrength("Secure1!");
  const match = getPasswordMatchState("Secure1!", "Secure1!");
  const mismatch = getPasswordMatchState("Secure1!", "Secure2!");
  const hash = await hashPassword("Secure1!");
  const verified = await verifyPassword("Secure1!", hash);

  return [
    {
      name: "passwordUx:liveStrengthRejectsWeak",
      ok: !isPasswordPolicySatisfied("abc") && weak.some((rule) => !rule.met),
    },
    {
      name: "passwordUx:liveStrengthAcceptsStrong",
      ok: isPasswordPolicySatisfied("Secure1!") && strong.every((rule) => rule.met),
    },
    {
      name: "passwordUx:confirmPasswordsMatch",
      ok: match === "match",
    },
    {
      name: "passwordUx:confirmPasswordsMismatch",
      ok: mismatch === "mismatch",
    },
    {
      name: "passwordHash:bcryptOnlyNeverPlainText",
      ok: verified && hash !== "Secure1!" && hash.startsWith("$2"),
    },
  ];
}

function checkRedirectGuard(): CheckResult[] {
  const redirectError = { digest: "NEXT_REDIRECT;replace;/home;307;" };
  const otherError = new Error("boom");

  return [
    {
      name: "authFix:isNextRedirectErrorDetectsRedirect",
      ok: isNextRedirectError(redirectError),
    },
    {
      name: "authFix:isNextRedirectErrorIgnoresOtherErrors",
      ok: !isNextRedirectError(otherError),
    },
  ];
}

function checkArchitectureSourceGuarantees(): CheckResult[] {
  const onboardingPath = path.join(
    ROOT,
    "src/core/auth/services/onboarding-service.ts"
  );
  const onboardingSource = readFileSync(onboardingPath, "utf8");

  const registerFormPath = path.join(
    ROOT,
    "src/app/(public)/register/register-form.tsx"
  );
  const registerFormSource = readFileSync(registerFormPath, "utf8");

  const authActionsPath = path.join(
    ROOT,
    "src/core/auth/actions/auth-actions.ts"
  );
  const authActionsSource = readFileSync(authActionsPath, "utf8");

  const homePath = path.join(ROOT, "src/app/(authenticated)/home/page.tsx");
  const homeSource = readFileSync(homePath, "utf8");

  const createFormPath = path.join(
    ROOT,
    "src/app/(authenticated)/businesses/create/create-business-form.tsx"
  );
  const createFormSource = readFileSync(createFormPath, "utf8");

  const authServicePath = path.join(
    ROOT,
    "src/core/auth/services/auth-service.ts"
  );
  const authServiceSource = readFileSync(authServicePath, "utf8");
  const middlewarePath = path.join(ROOT, "middleware.ts");
  const middlewareSource = readFileSync(middlewarePath, "utf8");
  const ip006aPath = path.join(ROOT, "scripts/ip006a-smoke-validation.ts");
  const ip006aSource = readFileSync(ip006aPath, "utf8");

  const openListPath = path.join(
    ROOT,
    "src/app/(authenticated)/home/platform-home-business-list.tsx"
  );
  const openListSource = readFileSync(openListPath, "utf8");
  const selectListPath = path.join(
    ROOT,
    "src/app/(authenticated)/select-business/select-business-list.tsx"
  );
  const selectListSource = readFileSync(selectListPath, "utf8");
  const selectActionsPath = path.join(
    ROOT,
    "src/core/auth/actions/select-business-actions.ts"
  );
  const selectActionsSource = readFileSync(selectActionsPath, "utf8");
  const nextConfigSource = readFileSync(
    path.join(ROOT, "next.config.ts"),
    "utf8"
  );
  const onboardingActionsSource = readFileSync(
    path.join(ROOT, "src/core/auth/actions/onboarding-actions.ts"),
    "utf8"
  );
  const createActionsSource = readFileSync(
    path.join(ROOT, "src/core/auth/actions/business-registration-actions.ts"),
    "utf8"
  );

  return [
    {
      name: "architecture:platformRegistrationDoesNotInsertBusiness",
      ok:
        !onboardingSource.includes("insert(business)") &&
        !onboardingSource.includes(".insert(business)"),
    },
    {
      name: "architecture:platformAuthDoesNotCallSupabaseAuth",
      ok:
        !authServiceSource.includes("createIdentityProviderAdapter") &&
        !authServiceSource.includes("supabase.auth") &&
        middlewareSource.includes("hasAuthSessionCookie") &&
        !middlewareSource.includes("supabase.auth"),
    },
    {
      name: "architecture:registerFormHasNoBusinessTypeField",
      ok: !registerFormSource.includes("businessTypeId"),
    },
    {
      name: "architecture:loginRedirectsToPlatformHome",
      ok: authActionsSource.includes('redirect("/home")'),
    },
    {
      name: "architecture:loginRethrowsNextRedirect",
      ok: authActionsSource.includes("isNextRedirectError"),
    },
    {
      name: "transition:registerRedirectsToPlatformHome",
      ok: onboardingActionsSource.includes('redirect("/home")'),
    },
    {
      name: "transition:createBusinessRedirectsToSetup",
      ok: createActionsSource.includes('redirect("/setup")'),
    },
    {
      name: "transition:openBusinessReturnsNextPath",
      ok:
        selectActionsSource.includes('"/setup"') &&
        selectActionsSource.includes('"/dashboard"') &&
        selectActionsSource.includes("nextPath") &&
        !selectActionsSource.includes('redirect("/setup")') &&
        !selectActionsSource.includes('redirect("/dashboard")'),
    },
    {
      name: "transition:openBusinessHardNavigates",
      ok:
        openListSource.includes("window.location.assign") &&
        openListSource.includes("result.data.nextPath") &&
        openListSource.includes("Open Business"),
    },
    {
      name: "transition:switchBusinessHardNavigates",
      ok:
        selectListSource.includes("window.location.assign") &&
        selectListSource.includes("result.data.nextPath"),
    },
    {
      name: "passwordUx:registerEnablesOnPolicyAndMatch",
      ok:
        registerFormSource.includes("isPasswordPolicySatisfied") &&
        registerFormSource.includes("getPasswordMatchState") &&
        registerFormSource.includes("passwordsReady") &&
        registerFormSource.includes('type="submit"') &&
        registerFormSource.includes("Create Your Account"),
    },
    {
      name: "passwordUx:registerRequiresBusinessNameField",
      ok:
        registerFormSource.includes('name="businessName"') &&
        registerFormSource.includes("required") &&
        !registerFormSource.includes("Proposed business name (optional)"),
    },
    {
      name: "platformHome:welcomeAndZeroBusinessCopy",
      ok:
        homeSource.includes("Welcome") &&
        homeSource.includes("You have:") &&
        homeSource.includes("My Businesses") &&
        homeSource.includes("Create Business") &&
        homeSource.includes("My Account"),
    },
    {
      name: "platformHome:switchOnlyWhenMultiple",
      ok:
        homeSource.includes("canSwitchBusiness") &&
        homeSource.includes("businessCount >= 2") &&
        homeSource.includes("Switch Business"),
    },
    {
      name: "platformHome:accountSeparateFromBusinesses",
      ok:
        homeSource.includes('id="my-businesses-heading"') &&
        homeSource.includes('id="my-account-heading"') &&
        !homeSource.includes("Manage Profile"),
    },
    {
      name: "myAccount:hubRenamedAndStructured",
      ok: (() => {
        const profileSource = readFileSync(
          path.join(ROOT, "src/app/(authenticated)/profile/page.tsx"),
          "utf8"
        );
        return (
          profileSource.includes('title="My Account"') &&
          profileSource.includes("Personal Information") &&
          profileSource.includes('label: "Security"') &&
          profileSource.includes("Preferences") &&
          profileSource.includes("Notifications") &&
          profileSource.includes("Account Information") &&
          !profileSource.includes('title="Manage Profile"') &&
          !profileSource.includes('label: "My Businesses"')
        );
      })(),
    },
    {
      name: "createBusiness:countryPrefillsFromRegistrationPhone",
      ok: (() => {
        const createPageSource = readFileSync(
          path.join(ROOT, "src/app/(authenticated)/businesses/create/page.tsx"),
          "utf8"
        );
        return (
          createPageSource.includes("inferCountryCodeFromE164") &&
          createFormSource.includes("Prefills from Platform Registration")
        );
      })(),
    },
    {
      name: "devConfig:allowedDevOriginsPresent",
      ok:
        nextConfigSource.includes("allowedDevOrigins") &&
        nextConfigSource.includes("192.168.100.70"),
    },
    {
      name: "businessRegistration:industryThenFilteredTemplate",
      ok:
        createFormSource.includes("Industry solution") &&
        createFormSource.includes("Business template") &&
        createFormSource.includes("filteredTemplates") &&
        createFormSource.includes("industryId"),
    },
    {
      name: "smoke:ip006aIsReadOnly",
      ok:
        !ip006aSource.includes("seedCountries(") &&
        !ip006aSource.includes(".insert(") &&
        !ip006aSource.includes(".update(") &&
        !ip006aSource.includes(".delete("),
    },
  ];
}

function checkRecoveryValidators(): CheckResult[] {
  const initiation = recoveryInitiationSchema.safeParse({
    mobileNumber: "712345678",
    countryCode: "KE",
  });

  const completion = recoveryCompletionSchema.safeParse({
    mobileNumber: "712345678",
    countryCode: "KE",
    securityAnswer: "Nairobi",
    newPassword: "Secure1!",
    confirmPassword: "Secure1!",
  });

  return [
    {
      name: "validator:recoveryInitiationSchema",
      ok: initiation.success,
    },
    {
      name: "validator:recoveryCompletionSchema",
      ok: completion.success,
    },
  ];
}

function checkServiceFactories(): CheckResult[] {
  const results: CheckResult[] = [];

  try {
    const recoveryService = createPasswordRecoveryService();
    results.push({
      name: "factory:createPasswordRecoveryService",
      ok: typeof recoveryService.initiateRecovery === "function",
    });
  } catch (error) {
    results.push({
      name: "factory:createPasswordRecoveryService",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const referenceDataService = createReferenceDataService();
    results.push({
      name: "factory:createReferenceDataService",
      ok:
        typeof referenceDataService.getActiveCountries === "function" &&
        typeof referenceDataService.getActiveIndustries === "function" &&
        typeof referenceDataService.getActiveBusinessTypes === "function",
    });
  } catch (error) {
    results.push({
      name: "factory:createReferenceDataService",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const hasFactory = typeof createAdminClient === "function";
    results.push({
      name: "factory:createAdminClient",
      ok: hasFactory,
    });
  } catch (error) {
    results.push({
      name: "factory:createAdminClient",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}

function printResults(results: CheckResult[]): boolean {
  let passed = 0;

  for (const result of results) {
    if (result.ok) {
      passed += 1;
      console.log(`PASS  ${result.name}`);
    } else {
      console.log(
        `FAIL  ${result.name}${result.detail ? ` — ${result.detail}` : ""}`
      );
    }
  }

  console.log("");
  console.log(
    `BP-001 / IP-005 smoke validation: ${passed}/${results.length} checks passed.`
  );

  return passed === results.length;
}

async function main() {
  console.log("Running BP-001 Platform Registration & Home smoke validation...");
  console.log("");

  const results = [
    ...checkRequiredFiles(),
    ...checkPlatformRegistrationValidators(),
    ...checkBusinessCreationValidators(),
    ...(await checkPasswordUx()),
    ...checkRedirectGuard(),
    ...checkArchitectureSourceGuarantees(),
    ...checkRecoveryValidators(),
    ...checkServiceFactories(),
  ];

  const ok = printResults(results);

  if (!ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("BP-001 / IP-005 smoke validation crashed:");
  console.error(error);
  process.exitCode = 1;
});
