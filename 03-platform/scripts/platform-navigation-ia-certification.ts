/**
 * Purpose:
 * Verify hub-first platform navigation (NAV-001).
 *
 * Certification artefact only — does not change production runtime.
 *
 * Usage:
 *   npx tsx scripts/platform-navigation-ia-certification.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { BUSINESS_APP_PREFIXES } from "@/lib/navigation/business-app-routes";
import {
  flattenPlatformNavItems,
  getMobilePrimaryNavItems,
  getPrimaryHubItems,
  navContainsHref,
} from "@/lib/navigation/nav-tree";
import {
  BUSINESS_APP_NAV_ITEMS,
  PRIMARY_HUB_IDS,
} from "@/lib/navigation/platform-nav-config";

type Result = { name: string; ok: boolean; detail?: string };

const ROOT = path.resolve(__dirname, "..");

function record(results: Result[], name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function main() {
  console.log("\nPLATFORM NAVIGATION IA CERTIFICATION (NAV-001)\n");
  const results: Result[] = [];

  const primary = getPrimaryHubItems(BUSINESS_APP_NAV_ITEMS);
  const primaryIds = primary.map((item) => item.id);

  record(
    results,
    "hubs:count",
    primaryIds.length === PRIMARY_HUB_IDS.length,
    primaryIds.join(", ")
  );
  record(
    results,
    "hubs:ids",
    PRIMARY_HUB_IDS.every((id) => primaryIds.includes(id)),
    PRIMARY_HUB_IDS.join(", ")
  );

  const crmHub = primary.find((item) => item.id === "crm");
  record(results, "hubs:crm-label", crmHub?.label === "CRM");
  record(results, "hubs:crm-href", crmHub?.href === "/crm");
  record(
    results,
    "hubs:no-customers-top-level",
    !primary.some((item) => item.id === "customers" || item.label === "Customers")
  );

  const customersNav = flattenPlatformNavItems(BUSINESS_APP_NAV_ITEMS).find(
    (item) => item.id === "customers" || item.href === "/customers"
  );
  record(results, "crm:customers-href", customersNav?.href === "/customers");
  record(
    results,
    "crm:customers-label-profile",
    customersNav?.label === "Customer Profile"
  );
  record(
    results,
    "crm:list-not-labelled-360",
    customersNav?.label !== "Customer 360"
  );

  const forbiddenTopLevel = [
    "leads",
    "opportunities",
    "accounts",
    "quotations",
    "campaigns",
    "crm-analytics",
    "crm-activities",
    "crm-appointments",
    "crm-visits",
    "crm-communications",
    "crm-cases",
    "invoices",
    "receipts",
    "payment-reviews",
    "commercial-resolve",
    "commercial-governance",
    "tax-compliance",
    "groups",
  ];
  for (const id of forbiddenTopLevel) {
    record(
      results,
      `hubs:not-top-level:${id}`,
      !primary.some((item) => item.id === id)
    );
  }

  const preservedHrefs = [
    "/dashboard",
    "/parties",
    "/groups",
    "/products",
    "/crm",
    "/customers",
    "/leads",
    "/opportunities",
    "/accounts",
    "/quotations",
    "/campaigns",
    "/crm-analytics",
    "/crm/activities",
    "/crm/appointments",
    "/crm/visits",
    "/crm/communications",
    "/crm/cases",
    "/crm/governance",
    "/sales",
    "/sales/convert-quote",
    "/commercial/resolve",
    "/commercial/governance",
    "/commercial/tax-compliance",
    "/payments",
    "/invoices",
    "/receipts",
    "/payments/exceptions",
    "/inventory",
    "/inventory/locations",
    "/inventory/receive",
    "/inventory/opening-balances",
    "/inventory/transfers",
    "/inventory/reservations",
    "/inventory/adjustments",
    "/inventory/stocktakes",
    "/inventory/traceability",
    "/inventory/controls",
    "/inventory/exceptions",
    "/settings",
  ];
  for (const href of preservedHrefs) {
    record(
      results,
      `routes:preserved:${href}`,
      navContainsHref(BUSINESS_APP_NAV_ITEMS, href)
    );
  }

  const prefixes = [
    "/inventory",
    "/commercial",
    "/crm",
    "/sales",
    "/payments",
  ];
  for (const prefix of prefixes) {
    record(
      results,
      `chrome-prefix:${prefix}`,
      BUSINESS_APP_PREFIXES.includes(prefix)
    );
  }

  const mobile = getMobilePrimaryNavItems(BUSINESS_APP_NAV_ITEMS).map(
    (item) => item.id
  );
  record(
    results,
    "mobile:primary",
    mobile.join(",") === "dashboard,crm,sales,payments",
    mobile.join(", ")
  );

  const leaves = flattenPlatformNavItems(BUSINESS_APP_NAV_ITEMS);
  record(
    results,
    "model:hierarchy",
    leaves.length > primary.length,
    `leaves=${leaves.length} hubs=${primary.length}`
  );

  const pages = [
    "src/app/(authenticated)/(app)/crm/page.tsx",
    "src/components/platform/platform-mobile-bottom-nav.tsx",
    "src/components/platform/platform-hub-sections.tsx",
    "src/lib/navigation/nav-tree.ts",
  ];
  for (const relative of pages) {
    record(results, `files:${relative}`, existsSync(path.join(ROOT, relative)));
  }

  const sidebar = readFileSync(
    path.join(ROOT, "src/components/platform/platform-sidebar.tsx"),
    "utf8"
  );
  record(
    results,
    "ux:nested-sidebar",
    sidebar.includes("aria-expanded") && sidebar.includes("nav-group-")
  );

  const config = readFileSync(
    path.join(ROOT, "src/lib/navigation/platform-nav-config.ts"),
    "utf8"
  );
  record(
    results,
    "language:no-ip-labels",
    !config.includes('label: "IP-') && !config.includes("BP-008")
  );

  const failed = results.filter((row) => !row.ok);
  console.log(
    `\n${failed.length === 0 ? "PASS" : "FAIL"} — ${results.length - failed.length}/${results.length} checks`
  );
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main();
