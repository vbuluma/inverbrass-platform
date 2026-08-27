/**
 * Purpose:
 * Customer Profile workspace page — Customer 360 default tab.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

import { redirect } from "next/navigation";

import { listPartyDocumentsAction } from "@/modules/party/actions/party-document-actions";
import { listPartyRelationshipsAction } from "@/modules/party/actions/party-relationship-actions";
import { listPartyTimelineAction } from "@/modules/party/actions/party-timeline-actions";
import {
  getCrmRecordAction,
  getCrmRegistrationCataloguesAction,
  getCustomer360PanelAction,
} from "@/modules/crm/actions/crm-actions";
import { CustomerWorkspace } from "@/modules/crm/components/customer-workspace";
import { CrmModuleErrorPage } from "@/modules/crm/components/crm-module-error-page";

type PageProps = {
  params: Promise<{ crmId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

function renderError(message: string) {
  return <CrmModuleErrorPage message={message} titleKind="workspace" />;
}

export default async function CustomerWorkspacePage({
  params,
  searchParams,
}: PageProps) {
  const { crmId } = await params;
  const { tab } = await searchParams;

  const [customerResult, cataloguesResult] = await Promise.all([
    getCrmRecordAction(crmId),
    getCrmRegistrationCataloguesAction(),
  ]);

  if (!customerResult.success) {
    if (
      customerResult.error.code === "SESSION_REQUIRED" ||
      customerResult.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return renderError(customerResult.error.message);
  }

  const partyId = customerResult.data.partyId;

  const [
    customer360Result,
    relationshipsResult,
    documentsResult,
    timelineResult,
  ] = await Promise.all([
    getCustomer360PanelAction(crmId),
    listPartyRelationshipsAction(partyId),
    listPartyDocumentsAction(partyId),
    listPartyTimelineAction(partyId),
  ]);

  if (!cataloguesResult.success) {
    return renderError(cataloguesResult.error.message);
  }

  if (!customer360Result.success) {
    return renderError(customer360Result.error.message);
  }

  if (!relationshipsResult.success) {
    return renderError(relationshipsResult.error.message);
  }

  if (!documentsResult.success) {
    return renderError(documentsResult.error.message);
  }

  if (!timelineResult.success) {
    return renderError(timelineResult.error.message);
  }

  return (
    <CustomerWorkspace
      customer={customerResult.data}
      catalogues={cataloguesResult.data}
      customer360={customer360Result.data}
      relationships={relationshipsResult.data}
      documents={documentsResult.data}
      timeline={timelineResult.data}
      initialTab={tab}
    />
  );
}
