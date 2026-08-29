/**
 * Purpose:
 * Scan BP-008 inventory source for architecture drift: provider SDKs,
 * payment/invoice/receipt logic, future IP behaviours, hard-coded UOM routing,
 * and client-authoritative businessId.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
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

const FUTURE_IP_PATTERNS = [
  /\breserveStock\s*\(/,
  /\bdeductSale\s*\(/,
  /\btransferStock\s*\(/,
  /\badjustStock\s*\(/,
  /\breturnStock\s*\(/,
  /\bfifo\b/i,
  /\bweightedAverage\b/,
  /\bmovingAverage\b/,
  /serialNumber/i,
  /batchNumber/i,
  /expiryDate/i,
];

const PAYMENT_SCHEMA_PATTERNS = [
  /from ["']@\/db\/schema\/payment-obligation["']/,
  /from ["']@\/db\/schema\/payment-invoice["']/,
  /from ["']@\/db\/schema\/payment-receipt["']/,
  /from ["']@\/db\/schema\/payment-refund["']/,
  /from ["']@\/db\/schema\/payment-transaction["']/,
  /from ["']@\/modules\/payments/,
];

const PRODUCT_MASTER_DUPLICATE_PATTERNS = [
  /createProduct\s*\(/,
  /insert\(product\)/,
  /from ["']@\/db\/schema\/product["']/,
];

const HARD_CODED_UOM_ROUTING = [
  /if\s*\(\s*uom\s*===/,
  /if\s*\(\s*unitCode\s*===/,
  /switch\s*\(\s*uom/,
  /case\s+["']EA["']/,
  /case\s+["']KG["']/,
];

const CLIENT_BUSINESS_ID = [
  /input\.businessId/,
  /command\.businessId/,
  /body\.businessId/,
  /formData\.get\(\s*["']businessId["']/,
];

export type InventoryArchitectureScanResult = {
  sdkHits: string[];
  httpHits: string[];
  futureIpHits: string[];
  paymentHits: string[];
  productMasterHits: string[];
  uomRoutingHits: string[];
  clientBusinessIdHits: string[];
  glHits: string[];
};

export function scanInventoryArchitecture(files: string[]): InventoryArchitectureScanResult {
  const result: InventoryArchitectureScanResult = {
    sdkHits: [],
    httpHits: [],
    futureIpHits: [],
    paymentHits: [],
    productMasterHits: [],
    uomRoutingHits: [],
    clientBusinessIdHits: [],
    glHits: [],
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
    if (/\bfetch\s*\(/.test(source) || /\baxios\b/.test(source)) {
      result.httpHits.push(rel);
    }
    if (!rel.includes("/architecture-scan")) {
      for (const pattern of FUTURE_IP_PATTERNS) {
        if (pattern.test(source)) {
          result.futureIpHits.push(rel);
          break;
        }
      }
    }
    for (const pattern of PAYMENT_SCHEMA_PATTERNS) {
      if (pattern.test(source)) {
        result.paymentHits.push(rel);
        break;
      }
    }
    if (!rel.includes("/adapters/product-catalogue-adapter")) {
      for (const pattern of PRODUCT_MASTER_DUPLICATE_PATTERNS) {
        if (pattern.test(source)) {
          result.productMasterHits.push(rel);
          break;
        }
      }
    }
    for (const pattern of HARD_CODED_UOM_ROUTING) {
      if (pattern.test(source)) {
        result.uomRoutingHits.push(rel);
        break;
      }
    }
    if (!rel.includes("/architecture-scan")) {
      for (const pattern of CLIENT_BUSINESS_ID) {
        if (pattern.test(source)) {
          result.clientBusinessIdHits.push(rel);
          break;
        }
      }
    }
    if (/general ledger|gl posting|journal entry|cogs/i.test(source)) {
      result.glHits.push(rel);
    }
  }

  result.httpHits = [...new Set(result.httpHits)];
  result.futureIpHits = [...new Set(result.futureIpHits)];
  result.productMasterHits = [...new Set(result.productMasterHits)];
  return result;
}
