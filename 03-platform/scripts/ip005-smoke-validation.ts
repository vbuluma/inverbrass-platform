/**
 * IP-005 smoke validation — structure, middleware safety, and validator checks.
 * Full E2E flows require migrated DB, seed data, and SUPABASE_SERVICE_ROLE_KEY.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { loginCredentialsSchema } from "../src/core/auth/validators/auth-validators";
import { ownerRegistrationUiSchema } from "../src/core/auth/validators/registration-ui-validators";
import {
  recoveryCompletionSchema,
  recoveryInitiationSchema,
} from "../src/core/auth/validators/recovery-validators";

const root = resolve(import.meta.dirname, "..");

function assertRouteExists(relativePath: string): void {
  assert.ok(
    existsSync(resolve(root, relativePath)),
    `Expected route file missing: ${relativePath}`
  );
}

console.info("IP-005 smoke validation starting...\n");

assertRouteExists("src/app/(public)/login/page.tsx");
assertRouteExists("src/app/(public)/register/page.tsx");
assertRouteExists("src/app/(public)/forgot-password/page.tsx");
assertRouteExists("src/app/(authenticated)/select-business/page.tsx");
assertRouteExists("src/app/(authenticated)/first-login/page.tsx");
assertRouteExists("src/app/(authenticated)/(app)/dashboard/page.tsx");
assertRouteExists("src/core/auth/services/password-recovery-service.ts");
assertRouteExists("src/core/auth/services/reference-data-service.ts");
assertRouteExists("src/core/auth/session/business-context-cookie-presence.ts");

console.info("✓ IP-005 route and service structure verified");

const middlewareSource = readFileSync(resolve(root, "middleware.ts"), "utf8");
assert.doesNotMatch(middlewareSource, /from "crypto"/);
assert.doesNotMatch(middlewareSource, /parseBusinessContextFromRequest/);
assert.match(middlewareSource, /business-context-cookie-presence/);
assert.match(middlewareSource, /\/forgot-password/);

console.info("✓ Middleware Edge-safe and /forgot-password public");

assert.equal(
  loginCredentialsSchema.safeParse({
    mobileNumber: "712345678",
    password: "TestPass1!",
    countryCode: "KE",
  }).success,
  true
);

assert.equal(
  ownerRegistrationUiSchema.safeParse({
    businessName: "Test Biz",
    businessTypeId: "00000000-0000-4000-8000-000000000001",
    countryCode: "KE",
    mobileNumber: "712345678",
    password: "TestPass1!",
    confirmPassword: "TestPass1!",
    securityQuestionId: "00000000-0000-4000-8000-000000000002",
    securityAnswer: "answer",
  }).success,
  true
);

assert.equal(
  ownerRegistrationUiSchema.safeParse({
    businessName: "Test Biz",
    businessTypeId: "00000000-0000-4000-8000-000000000001",
    countryCode: "KE",
    mobileNumber: "712345678",
    password: "weak",
    confirmPassword: "weak",
    securityQuestionId: "00000000-0000-4000-8000-000000000002",
    securityAnswer: "answer",
  }).success,
  false
);

assert.equal(
  recoveryInitiationSchema.safeParse({
    mobileNumber: "712345678",
    countryCode: "KE",
  }).success,
  true
);

assert.equal(
  recoveryCompletionSchema.safeParse({
    mobileNumber: "712345678",
    countryCode: "KE",
    securityAnswer: "answer",
    newPassword: "NewPass2@x",
    confirmPassword: "NewPass2@x",
  }).success,
  true
);

console.info("✓ Zod validators enforce login, registration, and recovery rules");

console.info("\nIP-005 smoke validation passed (static layer).");
console.info(
  "Note: Full E2E requires npm run db:migrate, npm run db:seed, and SUPABASE_SERVICE_ROLE_KEY."
);
