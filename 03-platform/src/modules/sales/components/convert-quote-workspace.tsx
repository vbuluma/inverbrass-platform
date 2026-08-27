"use client";

/**
 * Purpose:
 * Convert an accepted quotation into a sale from the Sales workspace.
 *
 * Implementation Package:
 * BP-006 / IP-05 – Downstream Handoff & Sales Workspace
 */

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";

import {
  PlatformEmptyState,
  PlatformFormActionFooter,
  PlatformProcessingButton,
} from "@/components/platform";
import { PageBackLink } from "@/components/platform/page-back-link";
import { buttonVariants } from "@/components/ui/button";
import {
  platformError,
  platformSuccess,
} from "@/core/platform/platform-action-helpers";
import type { PlatformActionResult } from "@/core/platform/types";
import { cn } from "@/lib/utils";
import { searchQuotationsAction } from "@/modules/crm/actions/quotation-actions";
import { QUOTATION_STATUS_CODES } from "@/modules/crm/constants";
import type { QuotationSummaryView } from "@/modules/crm/quotation/types";
import { convertQuotationToSaleAction } from "@/modules/sales/actions/sales-order-actions";

export function ConvertQuoteWorkspace() {
  const [isPending, startTransition] = useTransition();
  const [quotes, setQuotes] = useState<QuotationSummaryView[]>([]);
  const [actionResult, setActionResult] = useState<PlatformActionResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    startTransition(async () => {
      const result = await searchQuotationsAction({
        status: QUOTATION_STATUS_CODES.ACCEPTED,
        pageSize: 50,
      });
      if (!result.success) {
        setActionResult(
          platformError("Could not load quotations", result.error.message)
        );
        setLoaded(true);
        return;
      }
      setQuotes(result.data.items);
      setLoaded(true);
    });
  }, []);

  function convert(quotationId: string) {
    setActionResult(null);
    startTransition(async () => {
      const result = await convertQuotationToSaleAction(quotationId);
      if (!result.success) {
        setActionResult(platformError("Could not convert quote", result.error.message));
        return;
      }
      setQuotes((rows) => rows.filter((row) => row.id !== quotationId));
      setActionResult(
        platformSuccess(
          "Draft sale created",
          `Sale ${result.data.orderNumber} is ready to review and confirm.`
        )
      );
      window.location.href = `/sales/${result.data.id}`;
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/sales" label="Sales" />
      <div>
        <h1 className="text-2xl font-semibold">Convert quote</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Convert an accepted quotation into a sale. This does not start a disconnected
          second sale, collect payment, or move stock.
        </p>
      </div>

      {!loaded ? (
        <p className="text-sm text-muted-foreground">Loading accepted quotations…</p>
      ) : quotes.length === 0 ? (
        <PlatformEmptyState
          title="No accepted quotations ready"
          description="Accept a quotation first, then convert it here. You can also create a direct sale."
          actionLabel="Sell"
          actionHref="/sales/new"
        />
      ) : (
        <section className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Quotation</th>
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id} className="border-t">
                  <td className="px-3 py-2">
                    <Link href={`/quotations/${quote.id}`} className="hover:underline">
                      {quote.quotationNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{quote.partyDisplayName ?? "—"}</td>
                  <td className="px-3 py-2">
                    {quote.currencyCode} {quote.grandTotal}
                  </td>
                  <td className="px-3 py-2">
                    <PlatformProcessingButton
                      type="button"
                      isProcessing={isPending}
                      processingLabel="Converting…"
                      idleLabel="Convert to sale"
                      onClick={() => convert(quote.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <PlatformFormActionFooter
        result={actionResult}
        isProcessing={isPending}
        processingLabel="Working…"
        onDismiss={() => setActionResult(null)}
      >
        <Link href="/sales" className={cn(buttonVariants({ variant: "ghost" }))}>
          All sales
        </Link>
      </PlatformFormActionFooter>
    </main>
  );
}
