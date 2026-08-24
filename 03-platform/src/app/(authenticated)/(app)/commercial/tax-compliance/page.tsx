/**
 * Purpose:
 * Tax obligations page.
 */

import { Suspense } from "react";

import { TaxComplianceWorkspace } from "@/modules/commercial/components/tax-compliance-workspace";

export default function TaxCompliancePage() {
  return (
    <Suspense
      fallback={
        <main className="p-6 text-sm text-muted-foreground">
          Loading tax obligations…
        </main>
      }
    >
      <TaxComplianceWorkspace />
    </Suspense>
  );
}
