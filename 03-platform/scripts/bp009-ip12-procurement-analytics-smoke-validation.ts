/**
 * Purpose:
 * Smoke-validate BP-009 / IP-12 Procurement Analytics & Lifecycle Intelligence.
 *
 * Usage:
 *   npx tsx scripts/bp009-ip12-procurement-analytics-smoke-validation.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { CurrentBusinessContext } from "@/core/auth/types";
import { ALL_PROCUREMENT_PERMISSIONS, PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement";
import { LIFECYCLE_ANCHOR_TYPES, PROCUREMENT_PERMISSIONS } from "@/modules/procurement/constants";
import { scanProcurementArchitecture } from "@/modules/procurement/architecture-scan";
import {
  calculateRate,
  calculateSavings,
  explainCycleTime,
  toAnalyticsCsv,
} from "@/modules/procurement/services/procurement-analytics-rules";
import { ProcurementAnalyticsService } from "@/modules/procurement/services/procurement-analytics-service";
import { buildLifecycleNodes } from "@/modules/procurement/services/procurement-lifecycle-rules";
import type { ProcurementActor } from "@/modules/procurement/types";

const ROOT = path.resolve(__dirname, "..");
type Result = { name: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "drizzle/0092_bp009_ip011_evaluations_ip012_analytics.sql",
  "src/modules/procurement/services/procurement-analytics-service.ts",
  "src/modules/procurement/repositories/procurement-analytics-repository.ts",
  "src/modules/procurement/components/procurement-analytics-dashboard.tsx",
  "src/app/(authenticated)/(app)/procurement/analytics/page.tsx",
  "src/app/(authenticated)/(app)/procurement/lifecycle/[anchorType]/[anchorId]/page.tsx",
];

function record(results: Result[], name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function ctx(businessId: string): CurrentBusinessContext {
  return { businessId, platformUserId: "buyer-1", businessMembershipId: `mem-${businessId}` };
}

function actor(permissions = ALL_PROCUREMENT_PERMISSIONS): ProcurementActor {
  return { userId: "buyer-1", permissions };
}

async function expectError(run: () => Promise<unknown>, code: string) {
  try {
    await run();
    return false;
  } catch (error) {
    return error instanceof ProcurementError && error.code === code;
  }
}

async function main() {
  console.log("BP-009 IP-12 Procurement Analytics & Lifecycle Intelligence — smoke validation\n");
  const results: Result[] = [];

  for (const file of REQUIRED_FILES) {
    record(results, `files:${path.basename(file)}`, existsSync(path.join(ROOT, file)));
  }

  record(results, "AC-001:spend-dimensions-service", readFileSync(
    path.join(ROOT, "src/modules/procurement/services/procurement-analytics-service.ts"),
    "utf8"
  ).includes("spendBySupplier"));
  record(results, "AC-002:operational-kpis", readFileSync(
    path.join(ROOT, "src/modules/procurement/services/procurement-analytics-service.ts"),
    "utf8"
  ).includes("outstanding-pos") && readFileSync(
    path.join(ROOT, "src/modules/procurement/services/procurement-analytics-service.ts"),
    "utf8"
  ).includes("unmatched-invoices"));
  record(results, "AC-003:rfx-rates", calculateRate(3, 10) === "30.0%");
  record(results, "AC-004:cycle-time-explain", explainCycleTime([
    {
      id: "1",
      anchorType: LIFECYCLE_ANCHOR_TYPES.PURCHASE_REQUEST,
      label: "Request",
      status: "APPROVED",
      href: "/procurement/requests/1",
      timestamp: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "2",
      anchorType: LIFECYCLE_ANCHOR_TYPES.PURCHASE_ORDER,
      label: "PO",
      status: "ISSUED",
      href: "/procurement/orders/2",
      timestamp: "2026-01-11T00:00:00.000Z",
    },
  ]).cycleTimeDays === 10);
  const nodes = buildLifecycleNodes({
    purchaseRequest: {
      id: "pr-1",
      number: "PR-1",
      status: "APPROVED",
      submittedAt: "2026-01-01",
      approvedAt: "2026-01-02",
    },
    purchaseOrder: {
      id: "po-1",
      number: "PO-1",
      status: "ISSUED",
      issuedAt: "2026-01-10",
      acceptedAt: null,
    },
  });
  record(results, "AC-005:lifecycle-chain", nodes.length >= 2);
  record(results, "AC-005:bidirectional-hrefs", nodes.every((row) => row.href.startsWith("/procurement/")));
  record(
    results,
    "AC-006:permission-gated",
    await expectError(async () => {
      const service = new ProcurementAnalyticsService({
        getSpendBySupplier: async () => [],
        getSpendByCategory: async () => [],
        getSpendByBusinessUnit: async () => [],
        countOutstandingPurchaseOrders: async () => 0,
        countUnmatchedInvoices: async () => 0,
        countOpenExceptions: async () => 0,
        countContractExpiries: async () => 0,
        getRfxMetrics: async () => ({
          eventCount: 0,
          invitationCount: 0,
          responseCount: 0,
          awardCount: 0,
        }),
        countSupplierStatus: async () => [],
        loadLifecycleSnapshot: async () => ({}),
      } as never);
      await service.getDashboard(ctx("biz-a"), actor([PROCUREMENT_PERMISSIONS.PO_READ]));
    }, "UNAUTHORIZED")
  );
  const analyticsSource = readFileSync(
    path.join(ROOT, "src/modules/procurement/services/procurement-analytics-service.ts"),
    "utf8"
  ).toLowerCase();
  record(results, "AC-007:no-transaction-writes", !analyticsSource.includes(".insert(") && !analyticsSource.includes(".update("));
  record(
    results,
    "AC-008:no-bp012-scope",
    !analyticsSource.includes("rag") && !analyticsSource.includes("ocr") && !analyticsSource.includes("forecast model")
  );
  record(results, "AN-005:savings-formula", calculateSavings(1000, 850) === "150.00");
  record(results, "export:csv", toAnalyticsCsv([{ section: "test", amount: "1" }]).includes("section"));
  record(results, "architecture-scan-clean", scanProcurementArchitecture(path.join(ROOT, "src/modules/procurement")).supplierMaster.length === 0);

  const passed = results.filter((row) => row.ok).length;
  console.log(`\n${passed}/${results.length} checks passed.`);
  if (results.some((row) => !row.ok)) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
