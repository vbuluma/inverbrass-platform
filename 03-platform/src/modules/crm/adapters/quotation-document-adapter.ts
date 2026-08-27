/**
 * Purpose:
 * Quotation document generation adapter — ENG-015 stub (printable HTML v1).
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline (Phase 10.5)
 */

import type { QuotationDetailView } from "@/modules/crm/quotation/types";

export type QuotationDocumentSnapshot = {
  format: "HTML";
  generatedAt: string;
  quotationNumber: string;
  title: string;
  htmlContent: string;
};

export class QuotationDocumentAdapter {
  generateSnapshot(detail: QuotationDetailView): QuotationDocumentSnapshot {
    const generatedAt = new Date().toISOString();
    const linesHtml = detail.currentVersion.lines
      .map(
        (line) =>
          `<tr><td>${line.lineNumber}</td><td>${escapeHtml(line.offeringName)}</td><td>${line.quantity}</td><td>${line.unitPrice.toFixed(2)}</td><td>${line.lineTotal.toFixed(2)}</td></tr>`
      )
      .join("");

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Quotation ${escapeHtml(detail.quotationNumber)}</title></head>
<body>
  <h1>Quotation ${escapeHtml(detail.quotationNumber)}</h1>
  <p>Status: ${escapeHtml(detail.statusLabel)}</p>
  <p>Customer: ${escapeHtml(detail.partyDisplayName ?? detail.partyId)}</p>
  <p>Currency: ${escapeHtml(detail.currencyCode)}</p>
  <p>Valid until: ${detail.validUntil ? escapeHtml(detail.validUntil) : "—"}</p>
  <table border="1" cellpadding="6" cellspacing="0">
    <thead><tr><th>#</th><th>Offering</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
    <tbody>${linesHtml}</tbody>
  </table>
  <p><strong>Grand Total:</strong> ${detail.currentVersion.grandTotal.toFixed(2)} ${escapeHtml(detail.currencyCode)}</p>
  ${detail.notes ? `<p><strong>Notes:</strong> ${escapeHtml(detail.notes)}</p>` : ""}
  <p><em>Generated ${generatedAt}</em></p>
</body>
</html>`;

    return {
      format: "HTML",
      generatedAt,
      quotationNumber: detail.quotationNumber,
      title: `Quotation ${detail.quotationNumber}`,
      htmlContent,
    };
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function createQuotationDocumentAdapter() {
  return new QuotationDocumentAdapter();
}
