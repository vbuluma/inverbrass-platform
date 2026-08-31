/**
 * Purpose:
 * BP-004 end-to-end runtime integration validation (service layer).
 *
 * Uses the same services invoked by UI server actions.
 * View contracts are authoritative (crmId / leadId / opportunityId / accountId).
 *
 * Usage:
 *   npx tsx scripts/bp004-runtime-integration-validation.ts
 */

import "@/lib/env/load-env";

import { desc, eq, sql } from "drizzle-orm";

import type { CurrentBusinessContext } from "@/core/auth/types";
import { closeDb, getDb } from "@/db/client";
import { auditHistory } from "@/db/schema/audit-history";
import { businessMembership } from "@/db/schema/business-membership";
import { crmRecord } from "@/db/schema/crm-record";
import { partyTimeline } from "@/db/schema/party-timeline";
import {
  ACCOUNT_TYPE_CODES,
  CRM_CONTACT_ROLE_CODES,
} from "@/modules/crm/account/constants";
import { createAccountService } from "@/modules/crm/account/services/account-service";
import { createLeadAttributionAdapter } from "@/modules/crm/adapters/lead-attribution-adapter";
import { createOpportunityHandoffAdapter } from "@/modules/crm/adapters/opportunity-handoff-adapter";
import { CRM_STATUS_CODES, CRM_TYPE_CODES } from "@/modules/crm/constants";
import { LEAD_STATUS_CODES } from "@/modules/crm/lead/constants";
import { createLeadService } from "@/modules/crm/lead/services/lead-service";
import { createOpportunityService } from "@/modules/crm/opportunity/services/opportunity-service";
import { createCrmService } from "@/modules/crm/services/crm-service";
import { createCampaignService } from "@/modules/crm/campaign/services/campaign-service";
import { createQuotationService } from "@/modules/crm/quotation/services/quotation-service";
import { createCrmAnalyticsService } from "@/modules/crm/analytics/services/crm-analytics-service";
import { createCrmActivityService } from "@/modules/crm-activity/services/crm-activity-service";
import { CRM_ACTIVITY_TYPE_CODES } from "@/modules/crm-activity/constants";
import { createCrmAppointmentService } from "@/modules/crm-appointment/services/crm-appointment-service";
import { CRM_APPOINTMENT_TYPE_CODES } from "@/modules/crm-appointment/constants";
import { createCrmVisitService } from "@/modules/crm-visit/services/crm-visit-service";
import { CRM_VISIT_TYPE_CODES } from "@/modules/crm-visit/constants";
import { createCrmCommunicationService } from "@/modules/crm-communication/services/crm-communication-service";
import {
  CRM_COMMUNICATION_CHANNEL_CODES,
  CRM_COMMUNICATION_DIRECTION_CODES,
} from "@/modules/crm-communication/constants";
import { createCrmCaseService } from "@/modules/crm-case/services/crm-case-service";
import { CRM_CASE_TYPE_CODES } from "@/modules/crm-case/constants";
import { createCrmGovernanceService } from "@/modules/crm-governance/services/crm-governance-service";
import { createPartyRepository } from "@/modules/party/repositories/party-repository";
import { CAMPAIGN_TYPE_CODES } from "@/modules/crm/constants";
import { BUSINESS_APP_NAV_ITEMS } from "@/lib/navigation/platform-nav-config";
import { BUSINESS_APP_PREFIXES } from "@/lib/navigation/business-app-routes";
import { navContainsHref } from "@/lib/navigation/nav-tree";
import { CRM_WORKSPACE_TABS } from "@/modules/crm/constants";

type Result = {
  name: string;
  status: "PASS" | "FAIL" | "BLOCKED";
  detail?: string;
};

const stamp = Date.now();
const results: Result[] = [];

function record(name: string, status: Result["status"], detail?: string) {
  results.push({ name, status, detail });
  const tag = status === "PASS" ? "PASS" : status;
  console.log(`  [${tag}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function resolveContext(): Promise<CurrentBusinessContext> {
  const db = getDb();
  const [row] = await db
    .select({
      businessId: businessMembership.businessId,
      platformUserId: businessMembership.platformUserId,
      membershipId: businessMembership.id,
    })
    .from(businessMembership)
    .where(eq(businessMembership.status, "ACTIVE"))
    .limit(1);
  if (!row) throw new Error("No ACTIVE business_membership");
  return {
    businessId: row.businessId,
    platformUserId: row.platformUserId,
    businessMembershipId: row.membershipId,
  };
}

async function createParty(
  context: CurrentBusinessContext,
  label: string
) {
  return createPartyRepository().insert({
    businessId: context.businessId,
    partyNumber: `RT${stamp}${Math.floor(Math.random() * 900 + 100)}`.slice(0, 40),
    partyTypeCode: "INDIVIDUAL",
    displayName: label,
    statusCode: "ACTIVE",
    notes: "BP004 runtime integration",
    createdBy: context.platformUserId,
    updatedBy: context.platformUserId,
  });
}

async function timelineTypes(partyId: string) {
  const db = getDb();
  const rows = await db
    .select({ eventType: partyTimeline.eventType })
    .from(partyTimeline)
    .where(eq(partyTimeline.partyId, partyId))
    .orderBy(desc(partyTimeline.createdAt))
    .limit(40);
  return rows.map((r) => r.eventType);
}

async function auditOps(entityId: string) {
  const db = getDb();
  const rows = await db
    .select({
      operation: auditHistory.operation,
      entityName: auditHistory.entityName,
    })
    .from(auditHistory)
    .where(eq(auditHistory.entityId, entityId))
    .orderBy(desc(auditHistory.createdAt))
    .limit(40);
  return rows.map((r) => `${r.operation}:${r.entityName}`);
}

async function catalogueCounts() {
  const db = getDb();
  const rows = await db.execute(sql`
    SELECT 'crm_type' AS c, count(*)::int AS n FROM crm_type
    UNION ALL SELECT 'crm_status', count(*)::int FROM crm_status
    UNION ALL SELECT 'lead_source', count(*)::int FROM lead_source
    UNION ALL SELECT 'lead_status', count(*)::int FROM lead_status
    UNION ALL SELECT 'opportunity_stage', count(*)::int FROM opportunity_stage
    UNION ALL SELECT 'opportunity_loss_reason', count(*)::int FROM opportunity_loss_reason
    UNION ALL SELECT 'account_type', count(*)::int FROM account_type
    UNION ALL SELECT 'account_status', count(*)::int FROM account_status
    UNION ALL SELECT 'crm_contact_role', count(*)::int FROM crm_contact_role
  `);
  return rows as unknown as Array<{ c: string; n: number }>;
}

async function main() {
  console.log("\nBP-004 Runtime Integration Validation\n");
  const context = await resolveContext();
  console.log(
    `Context business=${context.businessId} user=${context.platformUserId}\n`
  );

  // --- Catalogues ---
  console.log("Catalogues");
  const counts = await catalogueCounts();
  for (const row of counts) {
    record(`catalogue:${row.c}`, row.n > 0 ? "PASS" : "FAIL", `count=${row.n}`);
  }

  // --- Nav / C360 contracts ---
  console.log("\nNavigation & C360 contracts");
  const requiredNav = [
    "/customers",
    "/leads",
    "/opportunities",
    "/accounts",
    "/quotations",
    "/campaigns",
    "/crm-analytics",
    "/crm/activities",
    "/crm/appointments",
    "/crm/visits",
    "/crm/communications",
    "/crm/cases",
    "/crm/governance",
  ];
  for (const href of requiredNav) {
    const ok = navContainsHref(BUSINESS_APP_NAV_ITEMS, href);
    record(`nav:${href}`, ok ? "PASS" : "FAIL");
  }
  for (const prefix of [
    "/customers",
    "/leads",
    "/opportunities",
    "/accounts",
    "/quotations",
    "/campaigns",
    "/crm-analytics",
    "/crm",
  ]) {
    record(
      `chrome-prefix:${prefix}`,
      BUSINESS_APP_PREFIXES.includes(prefix) ? "PASS" : "FAIL"
    );
  }
  for (const tab of [
    "activities",
    "visits",
    "communications",
    "cases",
    "quotations",
    "campaigns",
    "analytics",
  ]) {
    const entry = CRM_WORKSPACE_TABS.find((t) => t.id === tab);
    record(`c360-tab:${tab}`, entry?.available ? "PASS" : "FAIL");
  }

  // --- Adapters wired ---
  console.log("\nAdapters");
  const leadAdapter = createLeadAttributionAdapter();
  const oppAdapter = createOpportunityHandoffAdapter();
  record(
    "adapter:leadAttribution",
    leadAdapter.constructor.name.includes("LeadService") ? "PASS" : "FAIL",
    leadAdapter.constructor.name
  );
  record(
    "adapter:opportunityHandoff",
    oppAdapter.constructor.name.includes("OpportunityService") ? "PASS" : "FAIL",
    oppAdapter.constructor.name
  );

  // ========== T1 ==========
  console.log("\nT1 CRM spine");
  const crm = createCrmService();
  const t1Party = await createParty(context, `BP004 T1 Party ${stamp}`);
  const created = await crm.createCrmRecord(context, {
    partyId: t1Party.id,
    crmTypeCode: CRM_TYPE_CODES.INDIVIDUAL,
  });
  const crmId = created.crmId;
  record(
    "T1:create",
    Boolean(crmId) && created.statusCode === CRM_STATUS_CODES.PROSPECT
      ? "PASS"
      : "FAIL",
    `crmId=${crmId} status=${created.statusCode} number=${created.customerNumber}`
  );

  const afterStatus = await crm.transitionCrmStatus(context, crmId, {
    statusCode: CRM_STATUS_CODES.LEAD,
    version: created.version,
  });
  const dbRow = (
    await getDb().select().from(crmRecord).where(eq(crmRecord.id, crmId)).limit(1)
  )[0];
  const t1Timeline = await timelineTypes(t1Party.id);
  const t1Audit = await auditOps(crmId);
  const c360 = await crm.getCustomer360Panel(context, crmId);
  record(
    "T1:status",
    afterStatus.statusCode === CRM_STATUS_CODES.LEAD &&
      dbRow?.statusCode === CRM_STATUS_CODES.LEAD
      ? "PASS"
      : "FAIL",
    `status=${afterStatus.statusCode} db=${dbRow?.statusCode}`
  );
  record(
    "T1:timeline",
    t1Timeline.includes("CRM_RECORD_CREATED") &&
      t1Timeline.includes("CRM_STATUS_CHANGED")
      ? "PASS"
      : "FAIL",
    t1Timeline.join(",")
  );
  record(
    "T1:audit",
    t1Audit.some((a) => a.startsWith("CREATE:")) ? "PASS" : "FAIL",
    t1Audit.join(",")
  );
  record("T1:c360", Boolean(c360) ? "PASS" : "FAIL", Object.keys(c360).join(","));

  // ========== T2 ==========
  console.log("\nT2 Account/Contact");
  const accounts = createAccountService();
  const contactParty = await createParty(context, `BP004 T2 Contact ${stamp}`);
  const account = await accounts.createAccount(context, {
    name: `BP004 Account ${stamp}`,
    accountTypeCode: ACCOUNT_TYPE_CODES.SME,
    partyId: t1Party.id,
    crmRecordId: crmId,
  });
  const withContact = await accounts.assignContact(context, account.accountId, {
    contactPartyId: contactParty.id,
    roleCode: CRM_CONTACT_ROLE_CODES.DECISION_MAKER,
    isPrimary: true,
  });
  const t2Timeline = await timelineTypes(t1Party.id);
  const t2Audit = await auditOps(account.accountId);
  const hierarchy = await accounts.getAccountHierarchyWidgetSummary(
    context,
    t1Party.id
  );
  record(
    "T2:account",
    Boolean(account.accountId) ? "PASS" : "FAIL",
    `accountId=${account.accountId}`
  );
  record(
    "T2:contact",
    (withContact.contacts?.length ?? 0) >= 1 ? "PASS" : "FAIL",
    `contacts=${withContact.contacts?.length}`
  );
  record(
    "T2:timeline",
    t2Timeline.includes("ACCOUNT_CREATED") ||
      t2Timeline.includes("CONTACT_ROLE_ASSIGNED")
      ? "PASS"
      : "FAIL",
    t2Timeline.filter((t) => t.includes("ACCOUNT") || t.includes("CONTACT")).join(",")
  );
  record("T2:audit", t2Audit.length > 0 ? "PASS" : "FAIL", t2Audit.join(","));
  record("T2:c360-widget", Boolean(hierarchy) ? "PASS" : "FAIL");

  // ========== T3 ==========
  console.log("\nT3 Lead→Opportunity");
  const leads = createLeadService();
  const leadParty = await createParty(context, `BP004 T3 Lead ${stamp}`);
  const lead = await leads.createLead(context, {
    partyId: leadParty.id,
    sourceCode: "WEB",
    companyName: `Lead Co ${stamp}`,
  });
  let leadCur = await leads.transitionLeadStatus(context, lead.leadId, {
    statusCode: LEAD_STATUS_CODES.CONTACTED,
    version: lead.version,
  });
  leadCur = await leads.transitionLeadStatus(context, lead.leadId, {
    statusCode: LEAD_STATUS_CODES.QUALIFIED,
    version: leadCur.version,
  });
  const converted = await leads.convertLead(context, lead.leadId, {
    version: leadCur.version,
    createCrmIfMissing: true,
    createOpportunity: true,
    opportunityName: `Opp from Lead ${stamp}`,
  });
  const opps = createOpportunityService();
  const listed = converted.convertedCrmId
    ? await opps.listOpportunities(context, {
        crmRecordId: converted.convertedCrmId,
        limit: 5,
      })
    : { items: [], total: 0 };
  const opportunityId = listed.items[0]?.opportunityId;
  const t3Timeline = await timelineTypes(leadParty.id);
  const t3Audit = await auditOps(lead.leadId);
  const openWidget = await opps.getOpenOpportunitiesWidgetSummary(
    context,
    leadParty.id
  );
  record(
    "T3:lead-create",
    Boolean(lead.leadId) && lead.statusCode === LEAD_STATUS_CODES.NEW
      ? "PASS"
      : "FAIL",
    `leadId=${lead.leadId}`
  );
  record(
    "T3:convert",
    converted.statusCode === LEAD_STATUS_CODES.CONVERTED &&
      Boolean(converted.convertedCrmId) &&
      Boolean(opportunityId)
      ? "PASS"
      : "FAIL",
    `crm=${converted.convertedCrmId} opp=${opportunityId}`
  );
  record(
    "T3:timeline",
    t3Timeline.includes("LEAD_CREATED") &&
      t3Timeline.includes("LEAD_QUALIFIED") &&
      t3Timeline.includes("LEAD_CONVERTED")
      ? "PASS"
      : "FAIL",
    t3Timeline.join(",")
  );
  record("T3:audit", t3Audit.length > 0 ? "PASS" : "FAIL", t3Audit.join(","));
  record(
    "T3:c360-opp-widget",
    openWidget.openCount >= 1 ? "PASS" : "FAIL",
    `openCount=${openWidget.openCount}`
  );

  // ========== T4 ==========
  console.log("\nT4 Opportunity stages");
  if (!opportunityId || !converted.convertedCrmId) {
    record("T4:progression", "BLOCKED", "No opportunity from T3");
  } else {
    let won = await opps.getOpportunity(context, opportunityId);
    for (const stage of ["QUALIFICATION", "PROPOSAL", "NEGOTIATION"] as const) {
      won = await opps.transitionStage(context, won.opportunityId, {
        stageCode: stage,
        version: won.version,
      });
    }
    won = await opps.transitionStage(context, won.opportunityId, {
      stageCode: "CLOSED_WON",
      version: won.version,
      finalAmount: won.amount ?? "1000.00",
    });
    const catalogues = await opps.getRegistrationCatalogues(context);
    const lossReason = catalogues.lossReasons[0]?.code;
    const lost = await opps.createOpportunity(context, {
      crmRecordId: converted.convertedCrmId,
      name: `Lost Opp ${stamp}`,
      amount: "500.00",
      currencyCode: "USD",
    });
    const closedLost = await opps.transitionStage(context, lost.opportunityId, {
      stageCode: "CLOSED_LOST",
      version: lost.version,
      lossReasonCode: lossReason!,
      closeNotes: "runtime validation",
    });
    const wonTl = await timelineTypes(won.partyId);
    const lostTl = await timelineTypes(closedLost.partyId);
    record(
      "T4:won",
      won.statusCode === "WON" && won.stageCode === "CLOSED_WON" ? "PASS" : "FAIL",
      `${won.stageCode}/${won.statusCode}`
    );
    record(
      "T4:lost",
      closedLost.statusCode === "LOST" && closedLost.stageCode === "CLOSED_LOST"
        ? "PASS"
        : "FAIL",
      `${closedLost.stageCode}/${closedLost.statusCode}`
    );
    record(
      "T4:timeline",
      wonTl.includes("OPPORTUNITY_WON") &&
        lostTl.includes("OPPORTUNITY_LOST") &&
        wonTl.includes("STAGE_CHANGED")
        ? "PASS"
        : "FAIL",
      `won=${wonTl.filter((t) => t.includes("OPPORTUNITY") || t === "STAGE_CHANGED").join(",")} lost=${lostTl.filter((t) => t.includes("OPPORTUNITY")).join(",")}`
    );
  }

  // ========== Capability: Quotation + handoff ==========
  console.log("\nQuotations / handoff");
  try {
    const quotations = createQuotationService();
    const quoteParty = await createParty(context, `BP004 Quote Party ${stamp}`);
    const quoteCrm = await crm.createCrmRecord(context, {
      partyId: quoteParty.id,
      crmTypeCode: CRM_TYPE_CODES.INDIVIDUAL,
    });
    const quoteOpp = await opps.createOpportunity(context, {
      crmRecordId: quoteCrm.crmId,
      name: `Quote Opp ${stamp}`,
      amount: "2500.00",
      currencyCode: "USD",
    });

    const productRows = await getDb().execute(sql`
      SELECT id FROM product WHERE deleted_at IS NULL LIMIT 1
    `);
    const offeringId = (productRows as unknown as Array<{ id: string }>)[0]?.id;

    const quotation = await quotations.createQuotation(context, {
      partyId: quoteParty.id,
      crmRecordId: quoteCrm.crmId,
      opportunityId: quoteOpp.opportunityId,
      currencyCode: "USD",
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      lines: offeringId
        ? [{ offeringId, quantity: 1, unitPrice: 100 }]
        : undefined,
    });
    const quoteId = quotation.id;
    record("CAP:quotation-create", Boolean(quoteId) ? "PASS" : "FAIL", `id=${quoteId}`);

    if (!offeringId) {
      record(
        "CAP:quotation-accept",
        "BLOCKED",
        "No product/offering seeded — cannot add line required to send"
      );
      record("CAP:opp-handoff-on-accept", "BLOCKED", "Depends on quotation accept");
      record("CAP:sales-order", "BLOCKED", "Depends on accepted quotation");
    } else {
      let q = await quotations.getQuotationDetail(context, quoteId);
      if (q.approvalStatus === "PENDING") {
        await quotations.submitForApproval(context, quoteId);
        await quotations.approveQuotation(context, quoteId);
        q = await quotations.getQuotationDetail(context, quoteId);
      }
      q = await quotations.sendQuotation(context, quoteId);
      q = await quotations.acceptQuotation(context, quoteId);
      const oppAfter = await opps.getOpportunity(context, quoteOpp.opportunityId);
      record(
        "CAP:quotation-accept",
        q.status === "ACCEPTED" ? "PASS" : "FAIL",
        `quote=${quoteId} status=${q.status}`
      );
      record(
        "CAP:opp-handoff-on-accept",
        oppAfter.stageCode === "NEGOTIATION" || oppAfter.stageCode === "PROPOSAL"
          ? "PASS"
          : "FAIL",
        `stage=${oppAfter.stageCode}`
      );
      const so = await quotations.convertToSalesOrder(context, quoteId);
      record(
        "CAP:sales-order",
        Boolean(so) ? "PASS" : "FAIL",
        `so=${JSON.stringify(so).slice(0, 160)}`
      );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    record("CAP:quotation-flow", "FAIL", msg);
  }

  // ========== Capability: Campaign + lead attribution ==========
  console.log("\nCampaign / attribution");
  try {
    const campaigns = createCampaignService();
    const memberParty = await createParty(context, `BP004 Campaign Member ${stamp}`);
    const campaign = await campaigns.createCampaign(context, {
      name: `Runtime Campaign ${stamp}`,
      campaignType: CAMPAIGN_TYPE_CODES.EMAIL,
      currencyCode: "USD",
    });
    const attr = await createLeadAttributionAdapter().attributeLeadFromCampaignResponse(
      context,
      {
        campaignId: campaign.id,
        partyId: memberParty.id,
        memberId: "00000000-0000-4000-8000-000000000001",
      }
    );
    record(
      "CAP:lead-attribution-adapter",
      attr.attributed && Boolean(attr.leadId) && !attr.deferredToIp02
        ? "PASS"
        : "FAIL",
      JSON.stringify(attr)
    );
    record(
      "CAP:campaign-create",
      Boolean(campaign.id) ? "PASS" : "FAIL",
      `id=${campaign.id}`
    );
  } catch (error) {
    record(
      "CAP:campaign-attribution",
      "FAIL",
      error instanceof Error ? error.message : String(error)
    );
  }

  // ========== Service Engagement + Governance ==========
  console.log("\nService Engagement / Governance");
  try {
    const seParty = await createParty(context, `BP004 SE Party ${stamp}`);
    const activities = createCrmActivityService();
    const appointments = createCrmAppointmentService();
    const visits = createCrmVisitService();
    const communications = createCrmCommunicationService();
    const cases = createCrmCaseService();
    const governance = createCrmGovernanceService();

    const activity = await activities.createActivity(context, {
      activityTypeCode: CRM_ACTIVITY_TYPE_CODES.TASK,
      subject: `Runtime activity ${stamp}`,
      ownerUserId: context.platformUserId,
      primaryPartyId: seParty.id,
    });
    const activityTl = await timelineTypes(seParty.id);
    record(
      "CAP:activity-create",
      Boolean(activity.id) ? "PASS" : "FAIL",
      `id=${activity.id}`
    );
    record(
      "CAP:activity-timeline",
      activityTl.includes("ACTIVITY_CREATED") ? "PASS" : "FAIL",
      activityTl.filter((t) => t.includes("ACTIVITY")).join(",")
    );

    const start = new Date(Date.now() + 3600_000).toISOString();
    const end = new Date(Date.now() + 7200_000).toISOString();
    const appointment = await appointments.createAppointment(context, {
      appointmentTypeCode: CRM_APPOINTMENT_TYPE_CODES.MEETING,
      subject: `Runtime appointment ${stamp}`,
      startDateTime: start,
      endDateTime: end,
      ownerUserId: context.platformUserId,
      primaryPartyId: seParty.id,
    });
    record(
      "CAP:appointment-create",
      Boolean(appointment.id) ? "PASS" : "FAIL",
      `id=${appointment.id}`
    );

    const visit = await visits.createVisit(context, {
      visitTypeCode: CRM_VISIT_TYPE_CODES.SALES,
      subject: `Runtime visit ${stamp}`,
      visitDate: new Date().toISOString(),
      ownerUserId: context.platformUserId,
      primaryPartyId: seParty.id,
    });
    record(
      "CAP:visit-create",
      Boolean(visit.id) ? "PASS" : "FAIL",
      `id=${visit.id}`
    );

    const communication = await communications.logCommunication(context, {
      channelTypeCode: CRM_COMMUNICATION_CHANNEL_CODES.EMAIL,
      directionCode: CRM_COMMUNICATION_DIRECTION_CODES.OUTBOUND,
      summary: `Runtime communication ${stamp}`,
      ownerUserId: context.platformUserId,
      primaryPartyId: seParty.id,
      contactChannelValue: "runtime@example.com",
    });
    record(
      "CAP:communication-create",
      Boolean(communication.id) ? "PASS" : "FAIL",
      `id=${communication.id}`
    );

    const crmCase = await cases.createCase(context, {
      caseTypeCode: CRM_CASE_TYPE_CODES.QUERY,
      subject: `Runtime case ${stamp}`,
      description: "BP-004 runtime service engagement case",
      primaryPartyId: seParty.id,
      ownerUserId: context.platformUserId,
    });
    const caseTl = await timelineTypes(seParty.id);
    record(
      "CAP:case-create",
      Boolean(crmCase.id) ? "PASS" : "FAIL",
      `id=${crmCase.id}`
    );
    record(
      "CAP:case-timeline",
      caseTl.includes("CASE_OPENED") ? "PASS" : "FAIL",
      caseTl.filter((t) => t.includes("CASE")).join(",")
    );

    await governance.ensureDefaults(context);
    const panel = await governance.getPartyGovernancePanel(context, seParty.id);
    const validated = await governance.runValidation(context, {
      partyId: seParty.id,
    });
    record(
      "CAP:governance-panel",
      Boolean(panel) ? "PASS" : "FAIL",
      `status=${(panel as { governanceStatus?: string }).governanceStatus ?? "n/a"}`
    );
    record(
      "CAP:governance-validate",
      Boolean(validated) ? "PASS" : "FAIL",
      `status=${(validated as { governanceStatus?: string }).governanceStatus ?? "n/a"}`
    );
  } catch (error) {
    const cause =
      error instanceof Error && "cause" in error
        ? String((error as Error & { cause?: unknown }).cause)
        : "";
    record(
      "CAP:service-engagement",
      "FAIL",
      `${error instanceof Error ? error.message : String(error)}${cause ? ` | cause: ${cause}` : ""}`
    );
  }

  // ========== Analytics ==========
  console.log("\nAnalytics");
  try {
    const analytics = createCrmAnalyticsService();
    await analytics.ensureDefaults(context);
    const dash = await analytics.getDashboard(context);
    const customerAnalytics = await analytics.getCustomerAnalytics(
      context,
      t1Party.id
    );
    record(
      "CAP:analytics-dashboard",
      Boolean(dash) ? "PASS" : "FAIL",
      `keys=${Object.keys(dash as object).slice(0, 8).join(",")}`
    );
    record(
      "CAP:customer-analytics",
      Boolean(customerAnalytics) ? "PASS" : "FAIL",
      `health=${(customerAnalytics as { healthScore?: number }).healthScore ?? "n/a"}`
    );
  } catch (error) {
    record(
      "CAP:analytics",
      "FAIL",
      error instanceof Error ? error.message : String(error)
    );
  }

  // ========== Summary ==========
  const failed = results.filter((r) => r.status === "FAIL");
  const blocked = results.filter((r) => r.status === "BLOCKED");
  const passed = results.filter((r) => r.status === "PASS");
  console.log(
    `\nSummary: ${passed.length}/${results.length} PASS, ${failed.length} FAIL, ${blocked.length} BLOCKED`
  );
  if (failed.length) {
    console.log("\nFailures:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail ?? ""}`);
  }

  const spineKeys = [
    "T1:create",
    "T1:status",
    "T1:timeline",
    "T1:audit",
    "T1:c360",
    "T2:account",
    "T2:contact",
    "T2:timeline",
    "T2:audit",
    "T2:c360-widget",
    "T3:lead-create",
    "T3:convert",
    "T3:timeline",
    "T3:audit",
    "T3:c360-opp-widget",
    "T4:won",
    "T4:lost",
    "T4:timeline",
  ];
  const spineOk = spineKeys.every(
    (k) => results.find((r) => r.name === k)?.status === "PASS"
  );
  console.log(`\nCRM spine T1–T4: ${spineOk ? "READY" : "NOT READY"}`);

  await closeDb();
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
