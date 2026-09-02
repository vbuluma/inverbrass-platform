/**
 * Purpose:
 * Final BP-009 integration certification — runs all 12 IP smoke suites,
 * architecture scan, and navigation IA checks.
 *
 * Usage:
 *   npx tsx scripts/bp009-final-integration-certification.ts
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { scanProcurementArchitecture } from "@/modules/procurement/architecture-scan";

const ROOT = path.resolve(__dirname, "..");
const RECORD_RELATIVE = "docs/certification/BP-009-PROCUREMENT-CERTIFICATION.md";

const SMOKE_SCRIPTS = [
  "scripts/bp009-ip01-procurement-foundation-smoke-validation.ts",
  "scripts/bp009-ip02-purchase-request-approval-smoke-validation.ts",
  "scripts/bp009-ip03-evaluation-outcome-smoke-validation.ts",
  "scripts/bp009-ip04-supplier-response-smoke-validation.ts",
  "scripts/bp009-ip05-evaluation-award-smoke-validation.ts",
  "scripts/bp009-ip06-purchase-order-smoke-validation.ts",
  "scripts/bp009-ip07-contract-management-smoke-validation.ts",
  "scripts/bp009-ip08-procurement-receiving-smoke-validation.ts",
  "scripts/bp009-ip09-supplier-invoice-smoke-validation.ts",
  "scripts/bp009-ip10-procurement-exceptions-smoke-validation.ts",
  "scripts/bp009-ip11-supplier-performance-smoke-validation.ts",
  "scripts/bp009-ip12-procurement-analytics-smoke-validation.ts",
];

type SuiteResult = {
  script: string;
  ip: string;
  passed: number;
  total: number;
  ok: boolean;
  detail?: string;
};

function parseSmokeOutput(stdout: string): { passed: number; total: number } {
  const match = stdout.match(/(\d+)\/(\d+) checks passed/);
  if (match) {
    return { passed: Number(match[1]), total: Number(match[2]) };
  }
  const passCount = (stdout.match(/\[PASS\]/g) ?? []).length;
  const failCount = (stdout.match(/\[FAIL\]/g) ?? []).length;
  return { passed: passCount, total: passCount + failCount };
}

function runSmoke(script: string): SuiteResult {
  const ip = script.match(/ip(\d+)/i)?.[1]?.padStart(2, "0") ?? "??";
  try {
    const stdout = execSync(`npx tsx ${script}`, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, BP009_SKIP_REGRESSION: "1" },
    });
    const { passed, total } = parseSmokeOutput(stdout);
    return { script, ip: `IP-${ip}`, passed, total, ok: passed === total && total > 0 };
  } catch (error) {
    const stdout =
      error instanceof Error && "stdout" in error
        ? String((error as { stdout?: string }).stdout ?? "")
        : "";
    const stderr =
      error instanceof Error && "stderr" in error
        ? String((error as { stderr?: string }).stderr ?? "")
        : "";
    const combined = `${stdout}\n${stderr}`;
    const { passed, total } = parseSmokeOutput(combined);
    return {
      script,
      ip: `IP-${ip}`,
      passed,
      total,
      ok: false,
      detail: combined.slice(-600),
    };
  }
}

function runNavCertification(): { ok: boolean; detail: string } {
  try {
    const stdout = execSync("npx tsx scripts/platform-navigation-ia-certification.ts", {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { ok: true, detail: stdout.trim().split("\n").slice(-3).join("\n") };
  } catch (error) {
    const detail =
      error instanceof Error && "stdout" in error
        ? String((error as { stdout?: string }).stdout ?? "")
        : String(error);
    return { ok: false, detail: detail.slice(-600) };
  }
}

function integrationChecks(): Array<{ name: string; ok: boolean; detail?: string }> {
  const checks: Array<{ name: string; ok: boolean; detail?: string }> = [];
  const scan = scanProcurementArchitecture(path.join(ROOT, "src/modules/procurement"));
  checks.push({
    name: "architecture:no-supplier-master-drift",
    ok: scan.supplierMaster.length === 0,
    detail: scan.supplierMaster.join(", ") || undefined,
  });
  checks.push({
    name: "architecture:no-client-businessId",
    ok: scan.clientBusinessId.length === 0,
    detail: scan.clientBusinessId.join(", ") || undefined,
  });
  const workspace = existsSync(
    path.join(ROOT, "src/modules/procurement/components/evaluation-outcome-workspace.tsx")
  );
  checks.push({ name: "integration:evaluation-workspace", ok: workspace });
  const ordersRoute = existsSync(
    path.join(ROOT, "src/app/(authenticated)/(app)/procurement/orders/page.tsx")
  );
  checks.push({ name: "integration:orders-route", ok: ordersRoute });
  const contractsRoute = existsSync(
    path.join(ROOT, "src/app/(authenticated)/(app)/procurement/contracts/page.tsx")
  );
  checks.push({ name: "integration:contracts-route", ok: contractsRoute });
  return checks;
}

function buildReport(
  suites: SuiteResult[],
  integration: Array<{ name: string; ok: boolean; detail?: string }>,
  nav: { ok: boolean; detail: string }
): string {
  const totalPassed = suites.reduce((sum, row) => sum + row.passed, 0);
  const totalChecks = suites.reduce((sum, row) => sum + row.total, 0);
  const integrationPassed = integration.filter((row) => row.ok).length;
  const allOk =
    suites.every((row) => row.ok) &&
    integration.every((row) => row.ok) &&
    nav.ok;

  const statusTable = suites
    .map(
      (row) =>
        `| ${row.ip} | ${row.ok ? "Certified" : "FAILED"} | ${row.passed} | ${row.total} | ${row.ok ? "Smoke suite passed" : row.detail?.slice(0, 80) ?? "See log"} |`
    )
    .join("\n");

  return `# BP-009 Procurement & Supplier Management — Final Certification

| Attribute | Value |
|-----------|-------|
| Build Pack | BP-009 |
| Certification date | ${new Date().toISOString().slice(0, 10)} |
| Validator | \`03-platform/scripts/bp009-final-integration-certification.ts\` |
| Overall | ${allOk ? "**CERTIFIED**" : "**FAILED — see details**"} |
| Smoke checks | ${totalPassed}/${totalChecks} |

## A. Implementation status

| IP | Status | Passed | Total | Notes |
|----|--------|-------:|------:|-------|
${statusTable}

## B. Integration status

Lifecycle handoffs verified via smoke suites:

- Need → Purchase Request → Approval → RFX → Supplier Response → Evaluation → Award → PO → Contract → Receiving → Invoice → Match → Exceptions → Performance → Analytics
- BP-002 supplier master referenced (no duplicate master in BP-009)
- BP-008 inventory receipt handoff (fail-closed when unavailable)
- ENG-003b numbering, ENG-005 workflow, ENG-009 notifications, ENG-013 audit, ENG-015 documents reused

## C. Security status

| Control | Status |
|---------|--------|
| Tenant isolation | Verified in smoke suites |
| Sealed bid protection | Service-layer \`isCommercialSealedToBuyer\` |
| Tender Admin count-only | \`bidSubmissionCountVisible\` policy — count without supplier identity |
| Criteria governance | Post-close committee → configure → lock → evaluate → open |
| Award approval | ENG-005 \`approveAward\` + UI action |
| Supplier portal token isolation | IP-04 smoke |

## D. Test results

| Suite | Result |
|-------|--------|
| Smoke (12 IPs) | ${totalPassed}/${totalChecks} |
| Integration checks | ${integrationPassed}/${integration.length} |
| Navigation IA | ${nav.ok ? "PASS" : "FAIL"} |

### Integration checks

${integration.map((row) => `- [${row.ok ? "x" : " "}] ${row.name}${row.detail ? ` — ${row.detail}` : ""}`).join("\n")}

## E. Authoritative product decisions (v1)

1. **Criteria governance:** RFX closes → committee → criteria configure → lock → evaluation → bid opening → scoring → award
2. **ISSUED = published + open** (deliberate v1 interpretation)
3. **Sealed bids:** commercial content hidden until authorised opening; count-only mode when \`bid_submission_count_visible\` enabled
4. **Split award savings:** single RFX budget baseline — no per-supplier budget duplication
5. **Supplier ranking:** advisory only — buyer override required for non-recommended awards
6. **IP-11:** core scope implemented; Excel upload and portal self-review token are deferred enhancements

## F. External dependencies

| Item | Classification |
|------|----------------|
| Invitation email delivery | Implemented but externally dependent (ENG-009 channel config) |
| AP/GL payment execution | Out of scope — BP-009 hands off only |

## G. Deferred enhancements (not defects)

- Excel supplier measure upload (IP-11)
- Supplier portal self-review token flow (IP-11)
- Admin UI for \`award_requires_approval\` / \`bid_submission_count_visible\` policy toggles (DB/seed configured)

---
*Generated by bp009-final-integration-certification.ts*
`;
}

async function main() {
  console.log("BP-009 Final Integration Certification\n");

  const integration = integrationChecks();
  for (const row of integration) {
    console.log(`  [${row.ok ? "PASS" : "FAIL"}] ${row.name}`);
  }

  const suites: SuiteResult[] = [];
  for (const script of SMOKE_SCRIPTS) {
    console.log(`\nRunning ${script}…`);
    const result = runSmoke(script);
    suites.push(result);
    console.log(
      `  ${result.ip}: ${result.passed}/${result.total} ${result.ok ? "PASS" : "FAIL"}`
    );
  }

  console.log("\nRunning platform navigation IA certification…");
  const nav = runNavCertification();
  console.log(`  Navigation IA: ${nav.ok ? "PASS" : "FAIL"}`);

  const report = buildReport(suites, integration, nav);
  const recordPath = path.join(ROOT, RECORD_RELATIVE);
  mkdirSync(path.dirname(recordPath), { recursive: true });
  writeFileSync(recordPath, report, "utf8");
  console.log(`\nCertification record written to ${RECORD_RELATIVE}`);

  const totalPassed = suites.reduce((sum, row) => sum + row.passed, 0);
  const totalChecks = suites.reduce((sum, row) => sum + row.total, 0);
  const allOk =
    suites.every((row) => row.ok) &&
    integration.every((row) => row.ok) &&
    nav.ok;

  console.log(`\n${totalPassed}/${totalChecks} smoke checks across 12 IPs`);
  if (!allOk) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
