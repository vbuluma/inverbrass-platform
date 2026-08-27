/**
 * Purpose:
 * Scan BP-007 / ENG-006 source for architecture drift (provider SDKs,
 * hard-coded routing, invented limits, credit tender, order-line totals).
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const SKIP_DIR = new Set(["node_modules", ".next", "dist"]);

export function listSourceFiles(root: string): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (SKIP_DIR.has(entry)) {
        continue;
      }
      const full = path.join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
        continue;
      }
      if (/\.(ts|tsx|js|mjs)$/.test(entry)) {
        files.push(full);
      }
    }
  };
  walk(root);
  return files;
}

const PROVIDER_SDK_PATTERNS = [
  /daraja/i,
  /safaricom-sdk/i,
  /@safaricom/i,
  /airtel-sdk/i,
  /airtelmoney/i,
  /visa-sdk/i,
  /mastercard-sdk/i,
  /mpesa-sdk/i,
  /from ["']axios["']/,
  /from ["']node-fetch["']/,
];

const PROVIDER_URL_PATTERNS = [
  /sandbox\.safaricom/i,
  /api\.safaricom/i,
  /daraja\.safaricom/i,
  /openapi\.airtel/i,
  /api\.visa\.com/i,
  /api\.mastercard/i,
];

const HARD_CODED_LIMIT_PATTERNS = [
  /MAX_STK_AMOUNT\s*=/,
  /STK_MAX/,
  /=\s*150000\b/,
];

const HARD_CODED_ROUTING_PATTERNS = [
  /if\s*\(\s*provider\s*===/,
  /if\s*\(\s*rail\s*===/,
  /if\s*\(\s*bank\s*===/,
  /switch\s*\(\s*provider/,
  /case\s+["']SAFARICOM["']/,
  /case\s+["']MPESA["']/,
];

const CALLBACK_ROUTE_PATTERNS = [
  /\/payments\/safaricom/i,
  /\/payments\/mpesa/i,
  /\/mpesa\/webhook/i,
  /\/safaricom\/callback/i,
  /\/airtel\/callback/i,
  /\/visa\/webhook/i,
];

export type ArchitectureScanResult = {
  sdkHits: string[];
  httpHits: string[];
  limitHits: string[];
  routingHits: string[];
  creditTenderHits: string[];
  orderLineTotalHits: string[];
  callbackHits: string[];
  mutationHits: string[];
  collectionsHits: string[];
  statementHits: string[];
  paidMutationHits: string[];
  amountDueHits: string[];
};

export function scanPaymentArchitecture(files: string[]): ArchitectureScanResult {
  const result: ArchitectureScanResult = {
    sdkHits: [],
    httpHits: [],
    limitHits: [],
    routingHits: [],
    creditTenderHits: [],
    orderLineTotalHits: [],
    callbackHits: [],
    mutationHits: [],
    collectionsHits: [],
    statementHits: [],
    paidMutationHits: [],
    amountDueHits: [],
  };

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const rel = file.replace(/\\/g, "/");
    for (const pattern of PROVIDER_SDK_PATTERNS) {
      if (pattern.test(source)) {
        result.sdkHits.push(rel);
        break;
      }
    }
    for (const pattern of PROVIDER_URL_PATTERNS) {
      if (pattern.test(source)) {
        result.httpHits.push(rel);
        break;
      }
    }
    if (/\bfetch\s*\(/.test(source) || /\baxios\b/.test(source)) {
      result.httpHits.push(rel);
    }
    for (const pattern of HARD_CODED_LIMIT_PATTERNS) {
      if (pattern.test(source)) {
        result.limitHits.push(rel);
        break;
      }
    }
    for (const pattern of HARD_CODED_ROUTING_PATTERNS) {
      if (pattern.test(source)) {
        result.routingHits.push(rel);
        break;
      }
    }
    for (const pattern of CALLBACK_ROUTE_PATTERNS) {
      if (pattern.test(source)) {
        result.callbackHits.push(rel);
        break;
      }
    }
    if (
      /paymentMethod\s*=\s*["']CREDIT["']/.test(source) ||
      /code:\s*["']CREDIT["']/.test(source)
    ) {
      result.creditTenderHits.push(rel);
    }
    if (
      /sales_order_line/.test(source) ||
      /from ["']@\/db\/schema\/sales-order["']/.test(source)
    ) {
      if (/sum\(|reduce\(/.test(source) && /expectedPayable|lineTotal|grandTotal/.test(source)) {
        result.orderLineTotalHits.push(rel);
      }
      if (/from ["']@\/db\/schema\/sales-order["']/.test(source)) {
        result.orderLineTotalHits.push(rel);
      }
    }
    if (
      rel.includes("/services/payment-allocation") &&
      (/transaction\.amount\s*=/.test(source) ||
        (/providerTransactionReference\s*=/.test(source) &&
          /update\(/.test(source) &&
          !/snapshot/.test(source)))
    ) {
      result.mutationHits.push(rel);
    }
    if (
      rel.includes("/services/payment-exception") &&
      (/paidAmount\s*=/.test(source) || /obligation\.paid\s*=/.test(source))
    ) {
      result.paidMutationHits.push(rel);
    }
    if (rel.includes("/services/payment-exception") && /amountDue\s*=/.test(source)) {
      result.amountDueHits.push(rel);
    }
    if (/dunning|debt recovery|collector assignment|collections engine/.test(source)) {
      result.collectionsHits.push(rel);
    }
    if (
      /bank\s+statement|m-pesa\s+statement|cashbook\s+balancing|statement\s+import/.test(
        source
      )
    ) {
      result.statementHits.push(rel);
    }
  }

  result.httpHits = [...new Set(result.httpHits)];
  result.orderLineTotalHits = [...new Set(result.orderLineTotalHits)];
  result.collectionsHits = [...new Set(result.collectionsHits)];
  result.statementHits = [...new Set(result.statementHits)];
  return result;
}
