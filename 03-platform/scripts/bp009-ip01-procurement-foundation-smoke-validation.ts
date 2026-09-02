/**
 * Purpose:
 * Smoke-validate BP-009 / IP-01 Procurement Foundation & Supplier Relationship.
 * Exercises production services with an in-memory store. Not production runtime.
 *
 * Usage:
 *   npx tsx scripts/bp009-ip01-procurement-foundation-smoke-validation.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  ALL_PROCUREMENT_PERMISSIONS,
  PROCUREMENT_ERROR_CODES,
  PROCUREMENT_PERMISSIONS,
  PROCUREMENT_STATUS_CODES,
  ProcurementError,
  QUALIFICATION_STATUS_CODES,
} from "@/modules/procurement";
import { scanProcurementArchitecture } from "@/modules/procurement/architecture-scan";
import { RecordingProcurementAudit } from "@/modules/procurement/services/procurement-audit-helper";
import { ProcurementFoundationService } from "@/modules/procurement/services/procurement-foundation-service";
import { InMemoryProcurementStore } from "@/modules/procurement/services/procurement-memory-store";
import type { ProcurementActor } from "@/modules/procurement/types";

const ROOT = path.resolve(__dirname, "..");

type Result = { name: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "drizzle/0079_bp009_ip001_procurement_foundation.sql",
  "src/db/schema/procurement-profile.ts",
  "src/db/schema/supplier-qualification.ts",
  "src/modules/procurement/services/procurement-foundation-service.ts",
  "src/modules/procurement/services/supplier-eligibility-service.ts",
  "src/app/(authenticated)/(app)/procurement/page.tsx",
  "src/app/(authenticated)/(app)/procurement/suppliers/page.tsx",
];

function ctx(businessId: string, userId = "user-a"): CurrentBusinessContext {
  return {
    businessId,
    platformUserId: userId,
    businessMembershipId: `mem-${businessId}`,
  };
}

function actor(permissions: readonly string[] = ALL_PROCUREMENT_PERMISSIONS): ProcurementActor {
  return { userId: "user-a", permissions };
}

function partyFixture(
  overrides: Partial<{
    id: string;
    businessId: string;
    displayName: string;
    partyNumber: string;
    hasActiveSupplierRole: boolean;
  }> = {}
) {
  return {
    id: overrides.id ?? "party-a",
    businessId: overrides.businessId ?? "biz-a",
    displayName: overrides.displayName ?? "ABC Technologies",
    partyNumber: overrides.partyNumber ?? "PTY-0001",
    partyTypeCode: "ORGANIZATION",
    hasActiveSupplierRole: overrides.hasActiveSupplierRole ?? true,
  };
}

function harness() {
  const store = new InMemoryProcurementStore();
  store.seedParty(partyFixture());
  store.seedParty(
    partyFixture({
      id: "party-b",
      businessId: "biz-b",
      displayName: "Other Business Supplier",
      partyNumber: "PTY-B",
    })
  );
  store.seedParty(
    partyFixture({
      id: "party-no-role",
      displayName: "No Role Co",
      partyNumber: "PTY-0002",
      hasActiveSupplierRole: false,
    })
  );
  store.seedDocument({
    id: "doc-1",
    partyId: "party-a",
    businessId: "biz-a",
    documentTypeCode: "QUALIFICATION_CERTIFICATE",
    originalFileName: "certificate.pdf",
    statusCode: "ACTIVE",
  });
  const audit = new RecordingProcurementAudit();
  const service = new ProcurementFoundationService({
    parties: store.partyPort,
    documents: store.documentPort,
    catalogues: store.catalogues,
    profiles: store.profilesPort,
    qualifications: store.qualificationsPort,
    numbering: store.numbering,
    audit,
  });
  return { store, audit, service };
}

function record(results: Result[], name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function runAcceptance(): Promise<Result[]> {
  const results: Result[] = [];
  const { store, audit, service } = harness();
  const context = ctx("biz-a");
  const full = actor();

  const created = await service.createProfile(context, full, {
    partyId: "party-a",
    categoryCodes: ["IT_HARDWARE", "SOFTWARE"],
    capabilityCodes: ["SUPPLY", "INSTALLATION"],
  });
  record(results, "AC-001", created.partyId === "party-a" && Boolean(created.id));

  let missingParty = false;
  try {
    await service.createProfile(context, full, {
      partyId: "missing",
      categoryCodes: ["IT_HARDWARE"],
      capabilityCodes: ["SUPPLY"],
    });
  } catch (error) {
    missingParty =
      error instanceof ProcurementError &&
      error.code === PROCUREMENT_ERROR_CODES.PARTY_NOT_FOUND;
  }
  record(results, "AC-002", missingParty);

  record(
    results,
    "AC-003",
    !("supplierName" in created) && created.partyName === "ABC Technologies"
  );

  const assigned = await service.createProfile(context, full, {
    partyId: "party-no-role",
    assignSupplierRole: true,
    categoryCodes: ["LOGISTICS"],
    capabilityCodes: ["SUPPLY"],
  });
  record(results, "AC-004", assigned.partyId === "party-no-role");

  let duplicate = false;
  try {
    await service.createProfile(context, full, {
      partyId: "party-a",
      categoryCodes: ["IT_HARDWARE"],
      capabilityCodes: ["SUPPLY"],
    });
  } catch (error) {
    duplicate =
      error instanceof ProcurementError &&
      error.code === PROCUREMENT_ERROR_CODES.DUPLICATE_PROFILE;
  }
  record(results, "AC-005", duplicate);

  record(results, "AC-006", created.categories.length >= 2);
  record(results, "AC-007", created.capabilities.length >= 2);

  const qualified = await service.recordQualification(context, full, created.id, {
    qualificationTypeCode: "GENERAL",
    outcomeCode: QUALIFICATION_STATUS_CODES.QUALIFIED,
    effectiveDate: "2026-01-01",
    expiryDate: "2027-01-01",
    reviewDate: "2026-12-01",
    evidenceDocumentIds: ["doc-1"],
  });
  record(results, "AC-008", qualified.qualifications.length === 1);
  record(
    results,
    "AC-009",
    qualified.qualifications[0]?.expiryDate === "2027-01-01" &&
      qualified.qualifications[0]?.reviewDate === "2026-12-01"
  );
  record(results, "AC-010", qualified.qualifications[0]?.evidence[0]?.id === "doc-1");

  const suspended = await service.changeStatus(context, full, created.id, {
    statusCode: PROCUREMENT_STATUS_CODES.SUSPENDED,
    reason: "Delivery failure",
  });
  record(results, "AC-011", suspended.statusCode === PROCUREMENT_STATUS_CODES.SUSPENDED);
  record(
    results,
    "AC-012",
    audit.entries.some((entry) => entry.action.includes("SUSPENDED"))
  );

  await service.changeStatus(context, full, created.id, {
    statusCode: PROCUREMENT_STATUS_CODES.ACTIVE,
    reason: "Restored",
  });
  const blacklisted = await service.changeStatus(context, full, created.id, {
    statusCode: PROCUREMENT_STATUS_CODES.BLACKLISTED,
    reason: "Contractual breach",
    effectiveDate: "2026-08-01",
  });
  let preferredWhileBlacklisted = false;
  try {
    await service.setPreferred(context, full, created.id, { isPreferred: true });
  } catch (error) {
    preferredWhileBlacklisted = error instanceof ProcurementError;
  }
  record(
    results,
    "AC-013",
    blacklisted.statusCode === PROCUREMENT_STATUS_CODES.BLACKLISTED &&
      blacklisted.isPreferred === false &&
      preferredWhileBlacklisted
  );

  const listed = await service.listSuppliers(context, full, {});
  record(results, "AC-014", listed.some((row) => row.id === created.id));

  await service.changeStatus(context, full, created.id, {
    statusCode: PROCUREMENT_STATUS_CODES.ACTIVE,
    reason: "Cleared",
  });
  const preferred = await service.setPreferred(context, full, created.id, {
    isPreferred: true,
  });
  record(results, "AC-015", preferred.isPreferred);

  const eligible = await service.checkEligibility(context, full, "party-a");
  record(results, "AC-016", eligible.eligible === true);

  await service.changeStatus(context, full, created.id, {
    statusCode: PROCUREMENT_STATUS_CODES.BLACKLISTED,
    reason: "Contractual breach",
  });
  const ineligibleBlacklist = await service.checkEligibility(context, full, "party-a");
  record(results, "AC-017", ineligibleBlacklist.eligible === false);

  await service.changeStatus(context, full, created.id, {
    statusCode: PROCUREMENT_STATUS_CODES.SUSPENDED,
    reason: "Under review",
  });
  const ineligibleSuspended = await service.checkEligibility(context, full, "party-a");
  record(results, "AC-018", ineligibleSuspended.eligible === false);

  await service.changeStatus(context, full, created.id, {
    statusCode: PROCUREMENT_STATUS_CODES.ACTIVE,
    reason: "Restored again",
  });
  await service.recordQualification(context, full, created.id, {
    qualificationTypeCode: "GENERAL",
    outcomeCode: QUALIFICATION_STATUS_CODES.QUALIFIED,
    effectiveDate: "2025-01-01",
    expiryDate: "2025-06-01",
  });
  const ineligibleExpired = await service.checkEligibility(context, full, "party-a");
  record(results, "AC-019", ineligibleExpired.eligible === false);

  const unknown = await service.checkEligibility(context, full, "missing-party");
  record(results, "AC-020", unknown.eligible === false && unknown.reasons.length > 0);

  let crossBusiness = false;
  try {
    await service.getSupplier(ctx("biz-b"), full, created.id);
  } catch (error) {
    crossBusiness =
      error instanceof ProcurementError &&
      (error.code === PROCUREMENT_ERROR_CODES.PROFILE_NOT_FOUND ||
        error.code === PROCUREMENT_ERROR_CODES.CROSS_BUSINESS_ACCESS);
  }
  record(results, "AC-021", crossBusiness);

  let unauthorized = false;
  try {
    await service.changeStatus(context, actor([PROCUREMENT_PERMISSIONS.VIEW]), created.id, {
      statusCode: PROCUREMENT_STATUS_CODES.SUSPENDED,
      reason: "No",
    });
  } catch (error) {
    unauthorized =
      error instanceof ProcurementError &&
      error.code === PROCUREMENT_ERROR_CODES.UNAUTHORIZED;
  }
  record(results, "AC-022", unauthorized);

  const scan = scanProcurementArchitecture(path.join(ROOT, "src/modules/procurement"));
  record(results, "AC-023", scan.downstream.length === 0, scan.downstream.join(","));
  record(
    results,
    "AC-024",
    !readFileSync(
      path.join(ROOT, "src/modules/procurement/services/procurement-foundation-service.ts"),
      "utf8"
    ).includes("@/modules/inventory") &&
      !readFileSync(
        path.join(ROOT, "src/modules/procurement/services/procurement-foundation-service.ts"),
        "utf8"
      ).includes("@/modules/payments")
  );

  record(results, "scan:no-supplier-master", scan.supplierMaster.length === 0);
  record(results, "files:sql", existsSync(path.join(ROOT, REQUIRED_FILES[0]!)));
  for (const relative of REQUIRED_FILES) {
    record(results, `files:${relative}`, existsSync(path.join(ROOT, relative)));
  }

  const ui = [
    "src/modules/procurement/components/procurement-hub-workspace.tsx",
    "src/modules/procurement/components/supplier-list.tsx",
    "src/modules/procurement/components/supplier-profile-workspace.tsx",
    "src/modules/procurement/components/add-supplier-form.tsx",
  ]
    .map((relative) => readFileSync(path.join(ROOT, relative), "utf8"))
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  record(
    results,
    "ux:no-ip-labels",
    !ui.includes("BP-009") && !ui.includes("IP-01") && !ui.includes("PROC-025")
  );

  const nav = readFileSync(
    path.join(ROOT, "src/lib/navigation/platform-nav-config.ts"),
    "utf8"
  );
  record(results, "nav:procurement-hub", nav.includes('id: "procurement"'));
  record(results, "nav:suppliers-nested", nav.includes('href: "/procurement/suppliers"'));
  record(results, "nav:not-mobile-primary", !nav.includes('id: "procurement"') || !/id: "procurement"[\s\S]{0,200}mobilePrimary:\s*true/.test(nav));

  void store;
  return results;
}

async function main() {
  console.log("\nBP-009 IP-01 PROCUREMENT FOUNDATION SMOKE VALIDATION\n");
  const results = await runAcceptance();
  const failed = results.filter((row) => !row.ok);
  console.log(
    `\n${failed.length === 0 ? "PASS" : "FAIL"} — ${results.length - failed.length}/${results.length} checks`
  );
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

void main();
