/**
 * Purpose:
 * Scan BP-009 IP-01 source for scope creep: second supplier master,
 * downstream transactions, IP/BP labels in UI, and client-authoritative businessId.
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

const SUPPLIER_MASTER_PATTERNS = [
  /supplier_name/,
  /supplierName\s*:/,
  /supplier_address/,
  /supplierAddress/,
  /supplier_contact/,
  /supplierContactMaster/,
  /createSupplierMaster/,
];

const DOWNSTREAM_PATTERNS = [
  /createRfx/i,
  /createRfQ/i,
  /createRfp/i,
  /supplier_invoice/,
  /supplierInvoice/,
  /goods_receipt/,
  /goodsReceipt/,
  /award_decision/,
];

const CLIENT_BUSINESS_ID = [
  /businessId:\s*form/i,
  /payload\.businessId/,
  /input\.businessId/,
];

export function scanProcurementArchitecture(root: string) {
  const files = listSourceFiles(root).filter(
    (file) =>
      !file.includes(`${path.sep}architecture-scan.ts`) &&
      !file.includes("smoke-validation") &&
      !file.includes("procurement-memory-store") &&
      !file.includes("sourcing") &&
      !file.includes("purchase-order") &&
      !file.includes("contract") &&
      !file.includes("receiving") &&
      !file.includes("invoice") &&
      !file.includes("exception") &&
      !file.includes("performance") &&
      !file.includes("payment-ready") &&
      !file.includes("evaluation-outcome")
  );
  const supplierMaster: string[] = [];
  const downstream: string[] = [];
  const clientBusinessId: string[] = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    if (SUPPLIER_MASTER_PATTERNS.some((pattern) => pattern.test(text))) {
      if (!file.endsWith(`${path.sep}types.ts`)) {
        supplierMaster.push(file);
      }
    }
    if (DOWNSTREAM_PATTERNS.some((pattern) => pattern.test(text))) {
      if (!file.endsWith(`${path.sep}types.ts`) && !file.endsWith(`${path.sep}ports.ts`)) {
        downstream.push(file);
      }
    }
    if (file.includes(`${path.sep}components${path.sep}`) && CLIENT_BUSINESS_ID.some((pattern) => pattern.test(text))) {
      clientBusinessId.push(file);
    }
  }
  return { supplierMaster, downstream, clientBusinessId };
}
