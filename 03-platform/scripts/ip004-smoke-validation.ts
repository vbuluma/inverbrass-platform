/**
 * IP-004 smoke validation — static and unit-level checks only.
 * Does not replace authenticated E2E tests requiring Supabase + provisioned users.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { AUTHENTICATION_AUDIT_EVENT_TYPES } from "../src/core/audit/types";
import { createAuthService } from "../src/core/auth/services/auth-service";
import { createSecurityQuestionService } from "../src/core/auth/services/security-question-service";
import { firstLoginSchema } from "../src/core/auth/validators/first-login-validators";

const root = resolve(import.meta.dirname, "..");

function assertRouteExists(relativePath: string): void {
  assert.ok(
    existsSync(resolve(root, relativePath)),
    `Expected route file missing: ${relativePath}`
  );
}

function assertOrphanRouteRemoved(relativePath: string): void {
  assert.ok(
    !existsSync(resolve(root, relativePath)),
    `Orphan route folder still exists: ${relativePath}`
  );
}

console.info("IP-004 smoke validation starting...\n");

async function run(): Promise<void> {
assertRouteExists("src/app/(authenticated)/first-login/page.tsx");
assertRouteExists("src/app/(authenticated)/first-login/first-login-form.tsx");
assertRouteExists("src/app/(authenticated)/(app)/dashboard/page.tsx");
assertRouteExists("src/app/(authenticated)/layout.tsx");
assertRouteExists("src/app/(authenticated)/(app)/layout.tsx");
assertRouteExists("src/core/auth/guards/authenticated-route-guard.ts");
assertRouteExists("src/core/auth/session/business-context-cookie-presence.ts");

assertOrphanRouteRemoved("src/app/dashboard");
assertOrphanRouteRemoved("src/app/first-login");

console.info("✓ Route structure verified");

const authService = createAuthService();
assert.equal(typeof authService.getFirstLoginContext, "function");
assert.equal(typeof authService.completeFirstLogin, "function");
assert.equal(typeof authService.login, "function");

console.info("✓ AuthService first-login API present");

const invalidPolicy = firstLoginSchema.safeParse({
  currentPassword: "TempPass1!",
  newPassword: "weak",
  confirmPassword: "weak",
});
assert.equal(invalidPolicy.success, false);

const reusePassword = firstLoginSchema.safeParse({
  currentPassword: "TempPass1!",
  newPassword: "TempPass1!",
  confirmPassword: "TempPass1!",
});
assert.equal(reusePassword.success, false);

const validPayload = firstLoginSchema.safeParse({
  currentPassword: "TempPass1!",
  newPassword: "NewPass2@x",
  confirmPassword: "NewPass2@x",
  securityQuestionId: "00000000-0000-4000-8000-000000000001",
  securityAnswer: "answer",
});
assert.equal(validPayload.success, true);

console.info("✓ Password policy and first-login validation verified");

const securityQuestionService = createSecurityQuestionService();
const hash = await securityQuestionService.hashAnswer("Secret Answer");
assert.ok(hash.startsWith("$2"));
assert.notEqual(hash, "Secret Answer");
const verified = await securityQuestionService.verifyAnswer("Secret Answer", hash);
assert.equal(verified, true);
assert.equal(
  securityQuestionService.normalizeAnswer(" Secret Answer "),
  "secret answer"
);

console.info("✓ SecurityQuestionService hashing verified (bcrypt, no plaintext storage)");

assert.equal(
  AUTHENTICATION_AUDIT_EVENT_TYPES.PASSWORD_CHANGED,
  "PASSWORD_CHANGED"
);
assert.equal(
  AUTHENTICATION_AUDIT_EVENT_TYPES.FIRST_LOGIN_COMPLETED,
  "FIRST_LOGIN_COMPLETED"
);

console.info("✓ Audit event types verified");

const middlewareSource = readFileSync(resolve(root, "middleware.ts"), "utf8");
assert.doesNotMatch(middlewareSource, /from "crypto"/);
assert.doesNotMatch(middlewareSource, /business-context-cookie"/);
assert.match(middlewareSource, /business-context-cookie-presence/);

console.info("✓ Middleware Edge-safe import chain verified");

console.info("\nIP-004 smoke validation passed.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
