/**
 * Purpose:
 * Product Workspace Compliance tab — document matrix checklist and verification summary.
 *
 * Implementation Package:
 * BP-003 / IP-009 – Offering Documents & Compliance
 */

"use client";

import {
  COMPLIANCE_DISPLAY_STATUSES,
  type ComplianceDisplayStatus,
} from "@/core/document-compliance";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  OfferingDocumentRequirementView,
  OfferingDocumentsPanelView,
} from "@/modules/product/types";

type OfferingCompliancePanelProps = {
  initialData: OfferingDocumentsPanelView;
};

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(value)
    );
  } catch {
    return value;
  }
}

function statusBadgeClass(status: ComplianceDisplayStatus | string): string {
  switch (status) {
    case COMPLIANCE_DISPLAY_STATUSES.VERIFIED:
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
    case COMPLIANCE_DISPLAY_STATUSES.UPLOADED:
      return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200";
    case COMPLIANCE_DISPLAY_STATUSES.EXPIRED:
      return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function complianceStatusClass(status: string): string {
  switch (status) {
    case "Complete":
      return "text-emerald-600 dark:text-emerald-400";
    case "Expired":
      return "text-amber-600 dark:text-amber-400";
    case "Pending Verification":
      return "text-blue-600 dark:text-blue-400";
    case "Incomplete":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}

function SummaryMetric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: "amber" | "danger";
}) {
  const valueClass =
    highlight === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : highlight === "danger"
        ? "text-destructive"
        : undefined;

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${valueClass ?? ""}`}>{value}</p>
    </div>
  );
}

function RequirementRow({ requirement }: { requirement: OfferingDocumentRequirementView }) {
  return (
    <tr>
      <td className="py-3 pr-4 align-top">
        <p className="font-medium">{requirement.documentTypeName}</p>
        <p className="text-xs text-muted-foreground">
          {requirement.isRequired ? "Mandatory" : "Optional"}
        </p>
      </td>
      <td className="py-3 pr-4 align-top">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(requirement.status)}`}
        >
          {requirement.status}
        </span>
      </td>
      <td className="py-3 pr-4 align-top text-sm text-muted-foreground">
        {formatDate(requirement.issueDate)}
      </td>
      <td className="py-3 align-top text-sm text-muted-foreground">
        {formatDate(requirement.expiryDate)}
      </td>
    </tr>
  );
}

export function OfferingCompliancePanel({
  initialData,
}: OfferingCompliancePanelProps) {
  const summary = initialData.complianceSummary;
  const cards = initialData.summaryCards;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compliance Summary</CardTitle>
          <CardDescription>
            Document compliance evaluated via ENG-015a against ENG-003b
            regulatory configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryMetric label="Country" value={summary.countryName} />
            <SummaryMetric
              label="Applicable Rule Set"
              value={summary.ruleSetName ?? "—"}
            />
            <SummaryMetric
              label="Compliance Score"
              value={`${summary.complianceScore}%`}
            />
            <SummaryMetric
              label="Status"
              value={summary.complianceStatus}
              highlight={
                summary.complianceStatus === "Incomplete"
                  ? "danger"
                  : summary.complianceStatus === "Expired"
                    ? "amber"
                    : undefined
              }
            />
            <SummaryMetric
              label="Mandatory Documents"
              value={summary.mandatoryCount}
            />
            <SummaryMetric label="Uploaded" value={summary.uploadedCount} />
            <SummaryMetric label="Verified" value={summary.verifiedCount} />
            <SummaryMetric
              label="Expired"
              value={summary.expiredCount}
              highlight={summary.expiredCount > 0 ? "amber" : undefined}
            />
            <SummaryMetric
              label="Missing"
              value={summary.missingCount}
              highlight={summary.missingCount > 0 ? "danger" : undefined}
            />
          </div>
          <p
            className={`mt-4 text-sm font-medium ${complianceStatusClass(summary.complianceStatus)}`}
          >
            Overall status: {summary.complianceStatus}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Document Matrix</CardTitle>
          <CardDescription>
            Required and optional documents for this offering.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {initialData.requiredDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No regulatory document requirements are configured for this
              offering context.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Document Type</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Issue Date</th>
                    <th className="pb-2 font-medium">Expiry Date</th>
                  </tr>
                </thead>
                <tbody>
                  {initialData.requiredDocuments.map((requirement) => (
                    <RequirementRow
                      key={requirement.documentTypeCode}
                      requirement={requirement}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verification Summary</CardTitle>
          <CardDescription>
            Active documents and their verification state.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryMetric label="Total Active" value={cards.totalDocuments} />
            <SummaryMetric label="Verified" value={cards.verified} />
            <SummaryMetric label="Pending" value={cards.pending} />
            <SummaryMetric
              label="Expired Requirements"
              value={cards.expired}
              highlight={cards.expired > 0 ? "amber" : undefined}
            />
            <SummaryMetric
              label="Compliance Score"
              value={`${cards.complianceScore}%`}
            />
          </div>

          {initialData.verifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active documents to verify yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Document</th>
                    <th className="pb-2 pr-4 font-medium">File</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Verified By</th>
                    <th className="pb-2 font-medium">Verified At</th>
                  </tr>
                </thead>
                <tbody>
                  {initialData.verifications.map((row) => (
                    <tr key={row.offeringDocumentId}>
                      <td className="py-3 pr-4 align-top">
                        {row.documentTypeName}
                      </td>
                      <td className="py-3 pr-4 align-top text-muted-foreground">
                        {row.originalFileName}
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(row.verificationStatus)}`}
                        >
                          {row.verificationStatus}
                        </span>
                      </td>
                      <td className="py-3 pr-4 align-top text-muted-foreground">
                        {row.verifiedByDisplay ?? "—"}
                      </td>
                      <td className="py-3 align-top text-muted-foreground">
                        {formatDate(row.verifiedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
