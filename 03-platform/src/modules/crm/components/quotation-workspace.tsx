"use client";

/**
 * Quotation workspace — overview, lines, document, lifecycle actions.
 */

import Link from "next/link";
import { useState } from "react";

import { SetBreadcrumbs } from "@/components/platform/breadcrumb-context";
import {
  PlatformFormActionFooter,
  PlatformProcessingButton,
  PlatformTabs,
  PlatformWorkspaceHeader,
  PROCESSING_LABELS,
  useAsyncAction,
} from "@/components/platform";
import { platformError, platformSuccess } from "@/core/platform/platform-action-helpers";
import type { PlatformActionResult } from "@/core/platform/types";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  acceptQuotationAction,
  approveQuotationAction,
  convertQuotationToSalesOrderAction,
  generateQuotationDocumentAction,
  refreshQuotationPricesAction,
  rejectQuotationAction,
  reviseQuotationAction,
  sendQuotationAction,
  submitQuotationApprovalAction,
} from "@/modules/crm/actions/quotation-actions";
import { useCrmQuotationLabels } from "@/modules/crm/crm-terminology-labels";
import { QUOTATION_STATUS_CODES } from "@/modules/crm/constants";
import type { QuotationDetailView, SalesOrderDetailView } from "@/modules/crm/quotation/types";

type QuotationWorkspaceProps = {
  initialData: QuotationDetailView;
  initialTab?: string;
};

export function QuotationWorkspace({
  initialData,
  initialTab = "overview",
}: QuotationWorkspaceProps) {
  const labels = useCrmQuotationLabels();
  const [quotation, setQuotation] = useState(initialData);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [actionResult, setActionResult] = useState<PlatformActionResult | null>(null);
  const [documentHtml, setDocumentHtml] = useState<string | null>(null);
  const [salesOrder, setSalesOrder] = useState<SalesOrderDetailView | null>(null);
  const { isProcessing, run } = useAsyncAction();

  const isDraft = quotation.status === QUOTATION_STATUS_CODES.DRAFT;
  const isSent = quotation.status === QUOTATION_STATUS_CODES.SENT;
  const isAccepted = quotation.status === QUOTATION_STATUS_CODES.ACCEPTED;

  async function runLifecycle<T>(
    action: () => Promise<{ success: boolean; data?: T; error?: { message: string } }>,
    onSuccess: (data: T) => void,
    successMessage: string
  ) {
    setActionResult(null);
    await run(async () => {
      const result = await action();
      if (!result.success || !result.data) {
        setActionResult(
          platformError("Action failed", result.error?.message ?? "Unknown error")
        );
        return;
      }
      onSuccess(result.data);
      setActionResult(platformSuccess(successMessage, successMessage));
    });
  }

  return (
    <>
      <SetBreadcrumbs
        items={[
          { label: labels.moduleName, href: "/quotations" },
          { label: quotation.quotationNumber },
        ]}
      />

      <PlatformWorkspaceHeader
        backHref="/quotations"
        backLabel={labels.backLabel}
        workspaceLabel={labels.moduleName}
        title={quotation.quotationNumber}
        subtitle={`${quotation.partyDisplayName ?? quotation.partyId}`}
        statusLabel={quotation.statusLabel}
      />

      <PlatformTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        ariaLabel="Quotation workspace sections"
        tabs={[
          { id: "overview", label: labels.tabs.overview },
          { id: "lines", label: labels.tabs.lines },
          { id: "document", label: labels.tabs.document },
        ]}
      />

      {actionResult ? (
        <p
          className={
            actionResult.success ? "text-sm text-emerald-700" : "text-sm text-destructive"
          }
        >
          {actionResult.message}
        </p>
      ) : null}

      {activeTab === "overview" ? (
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Quotation header and lifecycle actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Customer</dt>
                <dd>{quotation.partyDisplayName ?? quotation.partyId}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Valid until</dt>
                <dd>{quotation.validUntil ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Version</dt>
                <dd>{quotation.currentVersionNumber}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Approval</dt>
                <dd>{quotation.approvalStatusLabel}</dd>
              </div>
            </dl>

            <PlatformFormActionFooter className="flex flex-wrap gap-2">
              {isDraft ? (
                <>
                  <PlatformProcessingButton
                    isProcessing={isProcessing}
                    processingLabel={PROCESSING_LABELS.saving}
                    idleLabel={labels.actions.refreshPrices}
                    onClick={() =>
                      runLifecycle(
                        () => refreshQuotationPricesAction(quotation.id),
                        setQuotation,
                        "Prices refreshed."
                      )
                    }
                  />
                  <PlatformProcessingButton
                    isProcessing={isProcessing}
                    processingLabel={PROCESSING_LABELS.saving}
                    idleLabel={labels.actions.submitApproval}
                    onClick={() =>
                      runLifecycle(
                        () => submitQuotationApprovalAction(quotation.id),
                        setQuotation,
                        "Submitted for approval."
                      )
                    }
                  />
                  <PlatformProcessingButton
                    isProcessing={isProcessing}
                    processingLabel={PROCESSING_LABELS.saving}
                    idleLabel={labels.actions.approve}
                    onClick={() =>
                      runLifecycle(
                        () => approveQuotationAction(quotation.id),
                        setQuotation,
                        "Quotation approved."
                      )
                    }
                  />
                  <PlatformProcessingButton
                    isProcessing={isProcessing}
                    processingLabel={PROCESSING_LABELS.saving}
                    idleLabel={labels.actions.send}
                    onClick={() =>
                      runLifecycle(
                        () => sendQuotationAction(quotation.id),
                        setQuotation,
                        "Quotation sent."
                      )
                    }
                  />
                </>
              ) : null}
              {isSent ? (
                <>
                  <PlatformProcessingButton
                    isProcessing={isProcessing}
                    processingLabel={PROCESSING_LABELS.saving}
                    idleLabel={labels.actions.accept}
                    onClick={() =>
                      runLifecycle(
                        () =>
                          acceptQuotationAction(quotation.id, {
                            acceptanceChannel: "CRM",
                          }),
                        setQuotation,
                        "Quotation accepted."
                      )
                    }
                  />
                  <PlatformProcessingButton
                    isProcessing={isProcessing}
                    processingLabel={PROCESSING_LABELS.saving}
                    idleLabel={labels.actions.reject}
                    onClick={() =>
                      runLifecycle(
                        () => rejectQuotationAction(quotation.id),
                        setQuotation,
                        "Quotation rejected."
                      )
                    }
                  />
                  <PlatformProcessingButton
                    isProcessing={isProcessing}
                    processingLabel={PROCESSING_LABELS.saving}
                    idleLabel={labels.actions.revise}
                    onClick={() =>
                      runLifecycle(
                        () => reviseQuotationAction(quotation.id, {}),
                        setQuotation,
                        "Revision created."
                      )
                    }
                  />
                </>
              ) : null}
              {isAccepted ? (
                <PlatformProcessingButton
                  isProcessing={isProcessing}
                  processingLabel={PROCESSING_LABELS.saving}
                  idleLabel={labels.actions.convertOrder}
                  onClick={() =>
                    runLifecycle(
                      () => convertQuotationToSalesOrderAction(quotation.id),
                      (data) => setSalesOrder(data),
                        "Draft sale created. Review and confirm next.",
                    )
                  }
                />
              ) : null}
              <PlatformProcessingButton
                isProcessing={isProcessing}
                processingLabel={PROCESSING_LABELS.saving}
                idleLabel={labels.actions.generateDocument}
                onClick={() =>
                  runLifecycle(
                    () => generateQuotationDocumentAction(quotation.id),
                    (data) => setDocumentHtml(data.htmlContent),
                    "Document generated."
                  )
                }
              />
            </PlatformFormActionFooter>

            {salesOrder ? (
              <p className="text-sm text-emerald-700">
                Sale {salesOrder.orderNumber} created as a draft.{" "}
                <Link href={`/sales/${salesOrder.id}`} className="underline">
                  Review and confirm
                </Link>
                . Payment is not yet recorded.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "lines" ? (
        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Offering</th>
                  <th className="py-2 pr-4">Qty</th>
                  <th className="py-2 pr-4">Unit Price</th>
                  <th className="py-2 pr-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {quotation.currentVersion.lines.map((line) => (
                  <tr key={line.id} className="border-b">
                    <td className="py-2 pr-4">{line.lineNumber}</td>
                    <td className="py-2 pr-4">{line.offeringName}</td>
                    <td className="py-2 pr-4">{line.quantity}</td>
                    <td className="py-2 pr-4">{line.unitPrice.toFixed(2)}</td>
                    <td className="py-2 pr-4">{line.lineTotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "document" ? (
        <Card>
          <CardHeader>
            <CardTitle>Quotation Document</CardTitle>
            <CardDescription>
              Printable HTML document (ENG-015 PDF deferred to Phase 2).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {documentHtml ? (
              <iframe
                title="Quotation document preview"
                srcDoc={documentHtml}
                className="min-h-[480px] w-full rounded border"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Generate a document from the Overview tab.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="pt-2">
        <Link href="/quotations" className={cn(buttonVariants({ variant: "outline" }))}>
          {labels.backLabel}
        </Link>
      </div>
    </>
  );
}
