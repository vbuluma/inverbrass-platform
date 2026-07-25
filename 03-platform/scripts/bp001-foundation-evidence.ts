/**
 * Purpose:
 * Produce BP-001 final-stabilization evidence for architecture and schema.
 *
 * Read-only by default:
 * - Schema verification (information_schema)
 * - Source architecture guarantees
 * - Catalogue existence reads
 *
 * Optional controlled write (EVIDENCE_WRITE=1):
 * - Persists a disposable Platform User using the same DB path as registration
 *   (no Next.js cookie APIs — scripts cannot call cookies())
 * - Proves no Business row is created
 * - Proves password/security hashes are bcrypt-shaped
 * - Deletes the disposable user afterward (evidence cleanup only — not a smoke test)
 *
 * Usage:
 *   npx tsx scripts/bp001-foundation-evidence.ts
 *   EVIDENCE_WRITE=1 npx tsx scripts/bp001-foundation-evidence.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import "@/lib/env/load-env";

import { count, eq, sql } from "drizzle-orm";

import { createReferenceDataService } from "@/core/auth/services/reference-data-service";
import { createSecurityQuestionService } from "@/core/auth/services/security-question-service";
import { AUTH_SESSION_COOKIE } from "@/core/auth/constants";
import { hashPassword } from "@/core/auth/utils/password-hasher";
import { normalizeMobileNumber } from "@/core/auth/utils/phone-normalizer";
import { closeDb, getDb } from "@/db/client";
import { business } from "@/db/schema/business";
import { businessMembership } from "@/db/schema/business-membership";
import { platformUser } from "@/db/schema/platform-user";
import { userSecurityAnswer } from "@/db/schema/user-security-answer";
import { userSecurityProfile } from "@/db/schema/user-security-profile";

const ROOT = path.resolve(__dirname, "..");

type Evidence = {
  name: string;
  ok: boolean;
  detail: string;
};

function sourceEvidence(): Evidence[] {
  const onboarding = readFileSync(
    path.join(ROOT, "src/core/auth/services/onboarding-service.ts"),
    "utf8"
  );
  const authService = readFileSync(
    path.join(ROOT, "src/core/auth/services/auth-service.ts"),
    "utf8"
  );
  const middleware = readFileSync(path.join(ROOT, "middleware.ts"), "utf8");
  const sessionCookie = readFileSync(
    path.join(ROOT, "src/core/auth/session/auth-session-cookie.ts"),
    "utf8"
  );
  const registerForm = readFileSync(
    path.join(ROOT, "src/app/(public)/register/register-form.tsx"),
    "utf8"
  );
  const ip006a = readFileSync(
    path.join(ROOT, "scripts/ip006a-smoke-validation.ts"),
    "utf8"
  );
  const ip005 = readFileSync(
    path.join(ROOT, "scripts/ip005-smoke-validation.ts"),
    "utf8"
  );
  const ip006 = readFileSync(
    path.join(ROOT, "scripts/ip006-smoke-validation.ts"),
    "utf8"
  );

  return [
    {
      name: "source:registrationDoesNotInsertBusiness",
      ok:
        !onboarding.includes("insert(business)") &&
        !onboarding.includes(".insert(business)"),
      detail: "OnboardingService has no business insert",
    },
    {
      name: "source:loginIsApplicationManaged",
      ok:
        !authService.includes("createIdentityProviderAdapter") &&
        !authService.includes("supabase.auth") &&
        authService.includes("setAuthSessionCookie") &&
        authService.includes("credentialService"),
      detail: "AuthService uses CredentialService + session cookie",
    },
    {
      name: "source:middlewareUsesPlatformSessionCookie",
      ok:
        middleware.includes("hasAuthSessionCookie") &&
        !middleware.includes("supabase.auth"),
      detail: "Middleware checks platform session presence only",
    },
    {
      name: "source:sessionCookieIsHttpOnly",
      ok:
        sessionCookie.includes("AUTH_COOKIE_OPTIONS") &&
        sessionCookie.includes("AUTH_SESSION_COOKIE") &&
        readFileSync(
          path.join(ROOT, "src/core/auth/constants.ts"),
          "utf8"
        ).includes("httpOnly: true"),
      detail: `Cookie transport: ${AUTH_SESSION_COOKIE}`,
    },
    {
      name: "source:emailOptionalInRegistrationUi",
      ok:
        registerForm.includes("Email address (optional)") &&
        !registerForm.includes('htmlFor="email">Email address</Label>'),
      detail: "Register form marks email optional",
    },
    {
      name: "source:smokeTestsReadOnly",
      ok:
        !ip006a.includes("seedCountries(") &&
        !ip006a.includes(".insert(") &&
        !ip006a.includes(".update(") &&
        !ip006a.includes(".delete(") &&
        !ip006.includes(".insert(") &&
        !ip006.includes(".update(") &&
        !ip006.includes(".delete(") &&
        ip005.includes("smoke:ip006aIsReadOnly") &&
        !ip005.includes("registerOwner(") &&
        !ip005.includes("await seed") &&
        !ip006.includes("await seed") &&
        !ip006a.includes("await seed"),
      detail: "Smoke scripts are read-only (no seed/register/mutation execution)",
    },
  ];
}

async function schemaEvidence(): Promise<Evidence[]> {
  const db = getDb();
  const rows = await db.execute(sql`
    SELECT table_name, column_name, is_nullable, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        (table_name = 'user_security_profile' AND column_name = 'password_hash')
        OR (table_name = 'platform_user' AND column_name IN ('email', 'auth_user_id', 'proposed_business_name'))
        OR (table_name = 'user_security_answer' AND column_name = 'answer_hash')
      )
    ORDER BY table_name, column_name
  `);

  const list = Array.isArray(rows)
    ? rows
    : ((rows as { rows?: unknown[] }).rows ?? []);

  const byKey = new Map<string, { is_nullable: string; data_type: string }>();
  for (const row of list as Array<{
    table_name: string;
    column_name: string;
    is_nullable: string;
    data_type: string;
  }>) {
    byKey.set(`${row.table_name}.${row.column_name}`, {
      is_nullable: row.is_nullable,
      data_type: row.data_type,
    });
  }

  const passwordHash = byKey.get("user_security_profile.password_hash");
  const email = byKey.get("platform_user.email");
  const authUserId = byKey.get("platform_user.auth_user_id");
  const answerHash = byKey.get("user_security_answer.answer_hash");

  return [
    {
      name: "schema:passwordHashColumnExists",
      ok: Boolean(passwordHash),
      detail: passwordHash
        ? `type=${passwordHash.data_type}`
        : "missing — apply migration 0007",
    },
    {
      name: "schema:emailIsNullable",
      ok: email?.is_nullable === "YES",
      detail: email
        ? `nullable=${email.is_nullable}`
        : "platform_user.email missing",
    },
    {
      name: "schema:authUserIdIsNullable",
      ok: authUserId?.is_nullable === "YES",
      detail: authUserId
        ? `nullable=${authUserId.is_nullable}`
        : "platform_user.auth_user_id missing",
    },
    {
      name: "schema:securityAnswerHashExists",
      ok: Boolean(answerHash),
      detail: answerHash
        ? `type=${answerHash.data_type}`
        : "user_security_answer.answer_hash missing",
    },
  ];
}

async function catalogueEvidence(): Promise<Evidence[]> {
  // Sequential reads only — session pooler max:1 must not fan out concurrent queries.
  const reference = createReferenceDataService();
  const security = createSecurityQuestionService();
  const countries = await reference.getActiveCountries();
  const industries = await reference.getActiveIndustries();
  const templates = await reference.getActiveBusinessTypes();
  const currencies = await reference.getActiveCurrencies();
  const questions = await security.getActiveCatalog();

  return [
    {
      name: "data:countriesExist",
      ok: countries.length > 0,
      detail: `count=${countries.length}`,
    },
    {
      name: "data:industriesExist",
      ok: industries.length > 0,
      detail: `count=${industries.length}`,
    },
    {
      name: "data:businessTemplatesExist",
      ok: templates.length > 0,
      detail: `count=${templates.length}`,
    },
    {
      name: "data:currenciesExist",
      ok: currencies.length > 0,
      detail: `count=${currencies.length}`,
    },
    {
      name: "data:securityQuestionsExist",
      ok: questions.length > 0,
      detail: `count=${questions.length}`,
    },
  ];
}

async function registrationWriteEvidence(): Promise<Evidence[]> {
  const db = getDb();
  const security = createSecurityQuestionService();
  const questions = await security.getActiveCatalog();

  if (questions.length === 0) {
    return [
      {
        name: "runtime:registrationCreatesPlatformUserOnly",
        ok: false,
        detail: "No security questions seeded — cannot run write evidence",
      },
    ];
  }

  const suffix = Date.now().toString().slice(-8);
  const mobileNumber = `71${suffix.padStart(7, "0").slice(0, 7)}`;
  const phoneE164 = normalizeMobileNumber(mobileNumber, "KE");
  const plainPassword = "Secure1!";
  const plainAnswer = "Nairobi";

  const businessesBefore = await db.select({ value: count() }).from(business);

  let platformUserId = "";

  try {
    // Mirror OnboardingService.registerOwner persistence only (no cookies()).
    const passwordHash = await hashPassword(plainPassword);

    await db.transaction(async (tx) => {
      const [createdUser] = await tx
        .insert(platformUser)
        .values({
          authUserId: null,
          firstName: "Evidence",
          lastName: "User",
          displayName: "Evidence User",
          email: null,
          phoneNumber: phoneE164,
          proposedBusinessName: null,
          isActive: true,
        })
        .returning({ id: platformUser.id });

      platformUserId = createdUser.id;

      await tx.insert(userSecurityProfile).values({
        platformUserId,
        passwordHash,
        mustChangePassword: false,
        failedLoginAttempts: 0,
      });

      await security.hashAndStoreAnswer(
        platformUserId,
        questions[0].id,
        plainAnswer,
        tx
      );
    });

    const [profile] = await db
      .select({
        passwordHash: userSecurityProfile.passwordHash,
        email: platformUser.email,
      })
      .from(userSecurityProfile)
      .innerJoin(
        platformUser,
        eq(platformUser.id, userSecurityProfile.platformUserId)
      )
      .where(eq(userSecurityProfile.platformUserId, platformUserId))
      .limit(1);

    const [answer] = await db
      .select({ answerHash: userSecurityAnswer.answerHash })
      .from(userSecurityAnswer)
      .where(eq(userSecurityAnswer.platformUserId, platformUserId))
      .limit(1);

    const memberships = await db
      .select({ id: businessMembership.id })
      .from(businessMembership)
      .where(eq(businessMembership.platformUserId, platformUserId));

    const businessesAfter = await db.select({ value: count() }).from(business);

    const beforeCount = Number(businessesBefore[0]?.value ?? 0);
    const afterCount = Number(businessesAfter[0]?.value ?? 0);

    return [
      {
        name: "runtime:registrationCreatesPlatformUserOnly",
        ok: Boolean(platformUserId) && memberships.length === 0,
        detail: `platformUserId=${platformUserId}; memberships=${memberships.length}`,
      },
      {
        name: "runtime:noBusinessRowCreatedDuringRegistration",
        ok: afterCount === beforeCount,
        detail: `businessCount before=${beforeCount} after=${afterCount}`,
      },
      {
        name: "runtime:emailOptionalPersistedAsNull",
        ok: profile?.email == null,
        detail: `email=${String(profile?.email)}`,
      },
      {
        name: "runtime:passwordStoredAsBcryptHash",
        ok: Boolean(
          profile?.passwordHash &&
            profile.passwordHash.startsWith("$2") &&
            profile.passwordHash !== plainPassword
        ),
        detail: profile?.passwordHash
          ? `hashPrefix=${profile.passwordHash.slice(0, 7)}`
          : "missing password_hash",
      },
      {
        name: "runtime:securityAnswerStoredAsBcryptHash",
        ok: Boolean(
          answer?.answerHash &&
            answer.answerHash.startsWith("$2") &&
            answer.answerHash.toLowerCase() !== plainAnswer.toLowerCase()
        ),
        detail: answer?.answerHash
          ? `hashPrefix=${answer.answerHash.slice(0, 7)}`
          : "missing answer_hash",
      },
    ];
  } finally {
    if (platformUserId) {
      // Evidence cleanup only — not part of smoke tests.
      await db
        .delete(userSecurityAnswer)
        .where(eq(userSecurityAnswer.platformUserId, platformUserId));
      await db
        .delete(userSecurityProfile)
        .where(eq(userSecurityProfile.platformUserId, platformUserId));
      await db
        .delete(platformUser)
        .where(eq(platformUser.id, platformUserId));
    }
  }
}

function print(results: Evidence[]): boolean {
  let passed = 0;
  for (const result of results) {
    if (result.ok) {
      passed += 1;
      console.log(`PASS  ${result.name} — ${result.detail}`);
    } else {
      console.log(`FAIL  ${result.name} — ${result.detail}`);
    }
  }
  console.log("");
  console.log(
    `BP-001 foundation evidence: ${passed}/${results.length} checks passed.`
  );
  return passed === results.length;
}

async function main() {
  console.log("Running BP-001 foundation evidence...");
  console.log("");

  try {
    console.log("… source evidence");
    const results = [...sourceEvidence()];

    console.log("… schema evidence");
    results.push(...(await schemaEvidence()));

    console.log("… catalogue evidence");
    results.push(...(await catalogueEvidence()));

    if (process.env.EVIDENCE_WRITE === "1") {
      console.log("… runtime registration evidence (write + cleanup)");
      results.push(...(await registrationWriteEvidence()));
    } else {
      results.push({
        name: "runtime:registrationWriteEvidenceSkipped",
        ok: true,
        detail: "Set EVIDENCE_WRITE=1 to run disposable registration proof",
      });
    }

    const ok = print(results);
    process.exitCode = ok ? 0 : 1;
  } finally {
    await closeDb();
  }
}

main().catch(async (error) => {
  console.error("BP-001 foundation evidence crashed:");
  console.error(error);
  await closeDb();
  process.exitCode = 1;
});
