/**
 * Purpose:
 * SL-CUS-005 narrow diagnostic suite (Tests A–G) before full live/cert.
 *
 * Lifecycle: open DB → serialize tests → await allSettled → closeDb → exit.
 * Respects postgres max:1 (no parallel DB fan-out).
 *
 * Run: npx tsx scripts/sl-cus-005-diagnostic.ts
 */

import "@/lib/env/load-env";

import { and, eq, ne } from "drizzle-orm";

import {
  resolveCustomerTenantByBusinessCode,
} from "@/core/channel-experience";
import { CustomerCommerceError } from "@/core/channel-experience/customer/commerce-errors";
import { createCustomerWebPaymentAdapter } from "@/core/channel-experience/customer/payment-adapter";
import { comparePaymentAmount } from "@/core/payment-engine";
import { closeDb, getDb } from "@/db/client";
import { business } from "@/db/schema/business";
import { catalogueChannel } from "@/db/schema/catalogue-channel";
import { product } from "@/db/schema/product";
import { productCataloguePublication } from "@/db/schema/product-catalogue-publication";
import { createPaymentAllocationRepository } from "@/modules/payments/repositories/payment-allocation-repository";
import { createPaymentObligationRepository } from "@/modules/payments/repositories/payment-obligation-repository";
import { createPaymentTransactionRepository } from "@/modules/payments/repositories/payment-transaction-repository";
import {
  FIXTURE_BUSINESS_CODE,
  buildStoreContext,
  createUnpaidCustomerObligation,
  ensureActivePrice,
  ensureStockFixture,
} from "./sl-cus-005-live-e2e";

type Row = {
  id: string;
  status: "PASS" | "FAIL" | "NA";
  detail?: string;
};

function log(step: string) {
  console.log(`[diag ${new Date().toISOString()}] ${step}`);
}

function formatErr(error: unknown): string {
  if (error instanceof CustomerCommerceError) {
    return [
      `commerce=${error.code}`,
      error.underlyingKind ? `kind=${error.underlyingKind}` : null,
      error.underlyingCode ? `under=${error.underlyingCode}` : null,
      error.message,
    ]
      .filter(Boolean)
      .join(" | ");
  }
  if (error instanceof Error) {
    const cause =
      "cause" in error && error.cause instanceof Error
        ? error.cause.message
        : undefined;
    return [error.name, error.message, cause ? `cause=${cause}` : null]
      .filter(Boolean)
      .join(" | ")
      .slice(0, 400);
  }
  return String(error).slice(0, 400);
}

async function main() {
  const results: Row[] = [];
  const stamp = Date.now();
  const paymentAdapter = createCustomerWebPaymentAdapter();
  const obligations = createPaymentObligationRepository();
  const transactions = createPaymentTransactionRepository();
  const allocations = createPaymentAllocationRepository();

  try {
    log("bootstrap fixture business");
    const db = getDb();
    const [biz] = await db
      .select()
      .from(business)
      .where(eq(business.code, FIXTURE_BUSINESS_CODE))
      .limit(1);
    if (!biz || biz.statusCode !== "ACTIVE") {
      results.push({
        id: "bootstrap",
        status: "NA",
        detail: `${FIXTURE_BUSINESS_CODE} not ACTIVE`,
      });
      return;
    }

    const [website] = await db
      .select()
      .from(catalogueChannel)
      .where(eq(catalogueChannel.code, "WEBSITE"))
      .limit(1);
    if (!website) {
      results.push({ id: "bootstrap", status: "FAIL", detail: "WEBSITE missing" });
      return;
    }

    const [pub] = await db
      .select({ productId: productCataloguePublication.productId })
      .from(productCataloguePublication)
      .innerJoin(product, eq(product.id, productCataloguePublication.productId))
      .where(
        and(
          eq(productCataloguePublication.businessId, biz.id),
          eq(productCataloguePublication.channelId, website.id),
          eq(productCataloguePublication.published, true)
        )
      )
      .limit(1);
    if (!pub) {
      results.push({
        id: "bootstrap",
        status: "NA",
        detail: "No published WEBSITE offering",
      });
      return;
    }

    await ensureActivePrice(biz.id, pub.productId);
    const available = await ensureStockFixture(biz.id, pub.productId);
    if (available < 4) {
      results.push({
        id: "bootstrap",
        status: "FAIL",
        detail: `stock available=${available}`,
      });
      return;
    }

    const tenant = await resolveCustomerTenantByBusinessCode(FIXTURE_BUSINESS_CODE);

    // --- Test A: full payment ---
    log("A full payment");
    {
      const guest = buildStoreContext(tenant, { offeringId: pub.productId });
      const unpaid = await createUnpaidCustomerObligation(
        guest,
        pub.productId,
        `diag-full-${stamp}`
      );
      const startOut = unpaid.outstanding;
      try {
        const pay = await paymentAdapter.initiatePaymentForOrder(guest, {
          orderReference: unpaid.orderReference,
          clientPaymentKey: `diag-full-key-${stamp}`,
        });
        const after = await obligations.findById(biz.id, unpaid.obligationId);
        const txs = await transactions.listByObligation(biz.id, unpaid.obligationId);
        const allocs = await allocations.listByObligation(biz.id, unpaid.obligationId);
        const ok =
          comparePaymentAmount(pay.outstandingAmount, "0") === 0 &&
          comparePaymentAmount(after?.outstandingAmount ?? "1", "0") === 0 &&
          txs.length === 1 &&
          allocs.filter((row) => row.status === "ALLOCATED").length === 1;
        results.push({
          id: "A-full-payment",
          status: ok ? "PASS" : "FAIL",
          detail: `startOut=${startOut} paid=${pay.amountPaid} out=${pay.outstandingAmount} tx=${txs.length} alloc=${allocs.length}`,
        });
      } catch (error) {
        results.push({
          id: "A-full-payment",
          status: "FAIL",
          detail: formatErr(error),
        });
      }
    }

    // --- Test B: partial payment 400 of outstanding (or half if not 1000) ---
    log("B partial payment");
    {
      const guest = buildStoreContext(tenant, { offeringId: pub.productId });
      const unpaid = await createUnpaidCustomerObligation(
        guest,
        pub.productId,
        `diag-partial-${stamp}`
      );
      const startDue = unpaid.outstanding;
      // Prefer 400 when outstanding >= 400; otherwise half (deterministic).
      const partialAmount =
        comparePaymentAmount(startDue, "400") >= 0
          ? "400.00"
          : (Number(startDue) / 2).toFixed(2);
      try {
        const pay = await paymentAdapter.initiatePaymentForOrder(guest, {
          orderReference: unpaid.orderReference,
          amount: partialAmount,
          clientPaymentKey: `diag-partial-key-${stamp}`,
        });
        const after = await obligations.findById(biz.id, unpaid.obligationId);
        const txs = await transactions.listByObligation(biz.id, unpaid.obligationId);
        const allocs = await allocations.listByObligation(
          biz.id,
          unpaid.obligationId
        );
        const expectedOut = (
          Number(startDue) - Number(partialAmount)
        ).toFixed(6);
        const ok =
          comparePaymentAmount(pay.amountPaid, partialAmount) === 0 &&
          comparePaymentAmount(after?.outstandingAmount ?? "0", expectedOut) ===
            0 &&
          comparePaymentAmount(after?.outstandingAmount ?? "0", "0") > 0 &&
          txs.length === 1 &&
          allocs.filter((row) => row.status === "ALLOCATED").length === 1;
        results.push({
          id: "B-partial-payment",
          status: ok ? "PASS" : "FAIL",
          detail: `due=${startDue} req=${partialAmount} paid=${pay.amountPaid} out=${after?.outstandingAmount} tx=${txs.length} alloc=${allocs.length}`,
        });

        // --- Test C: same key retry ---
        log("C idempotent retry");
        const again = await paymentAdapter.initiatePaymentForOrder(guest, {
          orderReference: unpaid.orderReference,
          amount: partialAmount,
          clientPaymentKey: `diag-partial-key-${stamp}`,
        });
        const txsAfter = await transactions.listByObligation(
          biz.id,
          unpaid.obligationId
        );
        results.push({
          id: "C-idempotent-retry",
          status:
            again.paymentReference === pay.paymentReference &&
            txsAfter.length === 1
              ? "PASS"
              : "FAIL",
          detail: `first=${pay.paymentReference} second=${again.paymentReference} tx=${txsAfter.length}`,
        });

        // --- Test D: same key different amount ---
        log("D payload conflict");
        try {
          await paymentAdapter.initiatePaymentForOrder(guest, {
            orderReference: unpaid.orderReference,
            amount: (Number(partialAmount) + 1).toFixed(2),
            clientPaymentKey: `diag-partial-key-${stamp}`,
          });
          results.push({
            id: "D-payload-conflict",
            status: "FAIL",
            detail: "unexpected allow",
          });
        } catch (error) {
          const denied =
            error instanceof CustomerCommerceError &&
            (error.underlyingKind === "idempotency_conflict" ||
              error.code === "PAYMENT_FAILED");
          results.push({
            id: "D-payload-conflict",
            status: denied ? "PASS" : "FAIL",
            detail: formatErr(error),
          });
        }
      } catch (error) {
        results.push({
          id: "B-partial-payment",
          status: "FAIL",
          detail: formatErr(error),
        });
        results.push({
          id: "C-idempotent-retry",
          status: "NA",
          detail: "skipped — B failed",
        });
        results.push({
          id: "D-payload-conflict",
          status: "NA",
          detail: "skipped — B failed",
        });
      }
    }

    // --- Concurrent duplicate (serialized contention under max:1) ---
    log("concurrent duplicate same key");
    {
      const guest = buildStoreContext(tenant, { offeringId: pub.productId });
      const unpaid = await createUnpaidCustomerObligation(
        guest,
        pub.productId,
        `diag-conc-${stamp}`
      );
      const amount =
        comparePaymentAmount(unpaid.outstanding, "400") >= 0
          ? "400.00"
          : (Number(unpaid.outstanding) / 2).toFixed(2);
      const key = `diag-conc-key-${stamp}`;
      // Sequential contention — Promise.all would fan out against max:1.
      let firstRef: string | null = null;
      let secondRef: string | null = null;
      let rejects = 0;
      try {
        const first = await paymentAdapter.initiatePaymentForOrder(guest, {
          orderReference: unpaid.orderReference,
          amount,
          clientPaymentKey: key,
        });
        firstRef = first.paymentReference;
      } catch (error) {
        rejects += 1;
        log(`conc first error ${formatErr(error)}`);
      }
      try {
        const second = await paymentAdapter.initiatePaymentForOrder(guest, {
          orderReference: unpaid.orderReference,
          amount,
          clientPaymentKey: key,
        });
        secondRef = second.paymentReference;
      } catch (error) {
        rejects += 1;
        log(`conc second error ${formatErr(error)}`);
      }
      const txs = await transactions.listByObligation(biz.id, unpaid.obligationId);
      const ok =
        firstRef != null &&
        secondRef === firstRef &&
        txs.length === 1 &&
        rejects === 0;
      results.push({
        id: "concurrent-idempotent-duplicate",
        status: ok ? "PASS" : "FAIL",
        detail: `refs=${firstRef}/${secondRef} tx=${txs.length} rejects=${rejects}`,
      });
    }

    // --- Test E: Customer A cannot pay Customer B ---
    log("E guest isolation");
    {
      const guestA = buildStoreContext(tenant, { offeringId: pub.productId });
      const unpaid = await createUnpaidCustomerObligation(
        guestA,
        pub.productId,
        `diag-guestA-${stamp}`
      );
      const guestB = buildStoreContext(tenant, { offeringId: pub.productId });
      try {
        await paymentAdapter.initiatePaymentForOrder(guestB, {
          orderReference: unpaid.orderReference,
          clientPaymentKey: `diag-guestB-${stamp}`,
        });
        results.push({
          id: "E-customer-isolation",
          status: "FAIL",
          detail: "unexpected allow",
        });
      } catch (error) {
        const denied =
          error instanceof CustomerCommerceError &&
          (error.code === "OBLIGATION_NOT_AVAILABLE" ||
            error.underlyingKind === "authorization_failure");
        results.push({
          id: "E-customer-isolation",
          status: denied ? "PASS" : "FAIL",
          detail: formatErr(error),
        });
      }
    }

    // --- Test F: Tenant A cannot pay Tenant B ---
    log("F tenant isolation");
    {
      const [other] = await db
        .select()
        .from(business)
        .where(
          and(ne(business.code, FIXTURE_BUSINESS_CODE), eq(business.statusCode, "ACTIVE"))
        )
        .limit(1);
      if (!other) {
        results.push({
          id: "F-tenant-isolation",
          status: "NA",
          detail: "No second ACTIVE business in DB",
        });
      } else {
        const guestA = buildStoreContext(tenant, { offeringId: pub.productId });
        const unpaid = await createUnpaidCustomerObligation(
          guestA,
          pub.productId,
          `diag-tenantA-${stamp}`
        );
        try {
          const otherTenant = await resolveCustomerTenantByBusinessCode(other.code);
          const guestOther = buildStoreContext(otherTenant, {
            offeringId: pub.productId,
          });
          await paymentAdapter.initiatePaymentForOrder(guestOther, {
            orderReference: unpaid.orderReference,
            clientPaymentKey: `diag-tenantB-${stamp}`,
          });
          results.push({
            id: "F-tenant-isolation",
            status: "FAIL",
            detail: "unexpected allow",
          });
        } catch (error) {
          const denied = error instanceof CustomerCommerceError;
          results.push({
            id: "F-tenant-isolation",
            status: denied ? "PASS" : "FAIL",
            detail: formatErr(error),
          });
        }
      }
    }

    // --- Test G: already paid reject ---
    log("G already settled");
    {
      const guest = buildStoreContext(tenant, { offeringId: pub.productId });
      const unpaid = await createUnpaidCustomerObligation(
        guest,
        pub.productId,
        `diag-settled-${stamp}`
      );
      await paymentAdapter.initiatePaymentForOrder(guest, {
        orderReference: unpaid.orderReference,
        clientPaymentKey: `diag-settle-pay-${stamp}`,
      });
      try {
        await paymentAdapter.initiatePaymentForOrder(guest, {
          orderReference: unpaid.orderReference,
          clientPaymentKey: `diag-settle-again-${stamp}`,
        });
        results.push({
          id: "G-already-paid",
          status: "FAIL",
          detail: "unexpected allow",
        });
      } catch (error) {
        const denied =
          error instanceof CustomerCommerceError &&
          (error.code === "PAYMENT_ALREADY_SETTLED" ||
            error.underlyingKind === "obligation_already_paid_or_ineligible");
        results.push({
          id: "G-already-paid",
          status: denied ? "PASS" : "FAIL",
          detail: formatErr(error),
        });
      }
    }
  } catch (error) {
    results.push({
      id: "harness",
      status: "FAIL",
      detail: formatErr(error),
    });
  } finally {
    await closeDb();
  }

  let pass = 0;
  let fail = 0;
  let na = 0;
  console.log("\n=== SL-CUS-005 DIAGNOSTIC RESULTS ===");
  for (const row of results) {
    console.log(
      `${row.status} ${row.id}${row.detail ? ` — ${row.detail}` : ""}`
    );
    if (row.status === "PASS") pass += 1;
    else if (row.status === "FAIL") fail += 1;
    else na += 1;
  }
  console.log(`\nTotals: ${pass} PASS / ${fail} FAIL / ${na} NA`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (error) => {
  console.error(error);
  await closeDb().catch(() => undefined);
  process.exit(1);
});
