/**
 * Purpose:
 * Lead workspace page.
 *
 * Implementation Package:
 * BP-004 / IP-02 – Lead Management
 */

import { redirect } from "next/navigation";

import { CrmModuleErrorPage } from "@/modules/crm/components/crm-module-error-page";
import {
  getLeadAction,
  getLeadRegistrationCataloguesAction,
} from "@/modules/crm/lead/actions/lead-actions";
import { LeadWorkspace } from "@/modules/crm/lead/components/lead-workspace";

type LeadDetailPageProps = {
  params: Promise<{ leadId: string }>;
};

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { leadId } = await params;

  const [leadResult, cataloguesResult] = await Promise.all([
    getLeadAction(leadId),
    getLeadRegistrationCataloguesAction(),
  ]);

  if (!leadResult.success) {
    if (
      leadResult.error.code === "SESSION_REQUIRED" ||
      leadResult.error.code === "INVALID_INPUT"
    ) {
      redirect("/select-business");
    }

    return <CrmModuleErrorPage message={leadResult.error.message} />;
  }

  if (!cataloguesResult.success) {
    return <CrmModuleErrorPage message={cataloguesResult.error.message} />;
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <LeadWorkspace lead={leadResult.data} catalogues={cataloguesResult.data} />
    </main>
  );
}
