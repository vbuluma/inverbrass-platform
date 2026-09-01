/**
 * Purpose:
 * BP-009 IP-12 procurement analytics orchestration. Read-only — no transaction writes.
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { PROCUREMENT_PERMISSIONS } from "@/modules/procurement/constants";
import { createProcurementAnalyticsRepository } from "@/modules/procurement/repositories/procurement-analytics-repository";
import {
  calculateRate,
  explainCycleTime,
  sortLifecycleNodes,
  toAnalyticsCsv,
} from "@/modules/procurement/services/procurement-analytics-rules";
import {
  buildLifecycleNodes,
  type LifecycleSnapshot,
} from "@/modules/procurement/services/procurement-lifecycle-rules";
import { assertPermission } from "@/modules/procurement/services/procurement-rules";
import type {
  ProcurementActor,
  ProcurementAnalyticsDashboardView,
  ProcurementLifecycleChainView,
} from "@/modules/procurement/types";

export class ProcurementAnalyticsService {
  constructor(
    private readonly repository = createProcurementAnalyticsRepository()
  ) {}

  async getDashboard(
    context: CurrentBusinessContext,
    actor: ProcurementActor
  ): Promise<ProcurementAnalyticsDashboardView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.ANALYTICS_READ);
    const businessId = context.businessId;
    const [
      spendBySupplier,
      spendByCategory,
      spendByBusinessUnit,
      outstandingPos,
      unmatchedInvoices,
      openExceptions,
      contractExpiries,
      rfx,
      supplierStatus,
    ] = await Promise.all([
      this.repository.getSpendBySupplier(businessId),
      this.repository.getSpendByCategory(businessId),
      this.repository.getSpendByBusinessUnit(businessId),
      this.repository.countOutstandingPurchaseOrders(businessId),
      this.repository.countUnmatchedInvoices(businessId),
      this.repository.countOpenExceptions(businessId),
      this.repository.countContractExpiries(businessId),
      this.repository.getRfxMetrics(businessId),
      this.repository.countSupplierStatus(businessId),
    ]);
    const preferredCount = supplierStatus
      .filter((row) => row.isPreferred)
      .reduce((sum, row) => sum + Number(row.value), 0);
    const suspendedCount = supplierStatus
      .filter((row) => row.statusCode === "SUSPENDED")
      .reduce((sum, row) => sum + Number(row.value), 0);
    const blacklistedCount = supplierStatus
      .filter((row) => row.statusCode === "BLACKLISTED")
      .reduce((sum, row) => sum + Number(row.value), 0);
    return {
      spendBySupplier: spendBySupplier.map((row) => ({
        profileId: row.profileId,
        label: row.profileId.slice(0, 8),
        amount: row.amount,
      })),
      spendByCategory: spendByCategory.map((row) => ({
        categoryCode: row.categoryCode,
        label: row.categoryCode,
        amount: row.amount,
      })),
      spendByBusinessUnit: spendByBusinessUnit.map((row) => ({
        businessUnitCode: row.businessUnitCode,
        label: row.businessUnitCode,
        amount: row.amount,
      })),
      sections: [
        {
          id: "procurement",
          title: "Procurement",
          description: "Spend and outstanding commitments.",
          kpis: [
            {
              id: "outstanding-pos",
              label: "Outstanding POs",
              value: String(outstandingPos),
              drilldownHref: "/procurement/orders",
            },
            {
              id: "po-value",
              label: "Issued PO value",
              value: spendBySupplier
                .reduce((sum, row) => sum + Number(row.amount), 0)
                .toFixed(2),
              drilldownHref: "/procurement/orders",
            },
          ],
        },
        {
          id: "supplier",
          title: "Supplier intelligence",
          description: "Status and concentration from operational records.",
          kpis: [
            {
              id: "preferred-suppliers",
              label: "Preferred suppliers",
              value: String(preferredCount),
              drilldownHref: "/procurement/suppliers",
            },
            {
              id: "suspended-suppliers",
              label: "Suspended suppliers",
              value: String(suspendedCount),
              drilldownHref: "/procurement/suppliers",
            },
            {
              id: "blacklisted-suppliers",
              label: "Blacklisted suppliers",
              value: String(blacklistedCount),
              drilldownHref: "/procurement/suppliers",
            },
          ],
        },
        {
          id: "rfx",
          title: "RFX",
          description: "Participation and award rates.",
          kpis: [
            {
              id: "rfx-count",
              label: "RFX events",
              value: String(rfx.eventCount),
              drilldownHref: "/procurement/sourcing",
            },
            {
              id: "response-rate",
              label: "Response rate",
              value: calculateRate(rfx.responseCount, rfx.invitationCount),
              drilldownHref: "/procurement/sourcing",
            },
            {
              id: "award-rate",
              label: "Award rate",
              value: calculateRate(rfx.awardCount, rfx.eventCount),
              drilldownHref: "/procurement/sourcing/awards",
            },
          ],
        },
        {
          id: "operational",
          title: "Operational",
          description: "Exceptions, invoices, and contract expiries.",
          kpis: [
            {
              id: "open-exceptions",
              label: "Open exceptions",
              value: String(openExceptions),
              drilldownHref: "/procurement/exceptions",
            },
            {
              id: "unmatched-invoices",
              label: "Unmatched invoices",
              value: String(unmatchedInvoices),
              drilldownHref: "/procurement/invoices",
            },
            {
              id: "contract-expiries",
              label: "Contracts expiring (90d)",
              value: String(contractExpiries),
              drilldownHref: "/procurement/contracts",
            },
          ],
        },
      ],
    };
  }

  async getLifecycleChain(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    anchorType: string,
    anchorId: string
  ): Promise<ProcurementLifecycleChainView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.ANALYTICS_READ);
    const snapshot = await this.repository.loadLifecycleSnapshot(
      context.businessId,
      anchorType,
      anchorId
    );
    return this.buildChainView(anchorType, anchorId, snapshot);
  }

  buildChainView(
    anchorType: string,
    anchorId: string,
    snapshot: LifecycleSnapshot
  ): ProcurementLifecycleChainView {
    const nodes = sortLifecycleNodes(buildLifecycleNodes(snapshot));
    const { cycleTimeDays, explanation } = explainCycleTime(nodes);
    return {
      anchorType,
      anchorId,
      nodes,
      cycleTimeDays,
      cycleTimeExplanation: explanation,
    };
  }

  async exportDashboardCsv(
    context: CurrentBusinessContext,
    actor: ProcurementActor
  ): Promise<string> {
    const dashboard = await this.getDashboard(context, actor);
    const rows = [
      ...dashboard.spendBySupplier.map((row) => ({
        section: "spend_by_supplier",
        key: row.profileId,
        label: row.label,
        amount: row.amount,
      })),
      ...dashboard.spendByCategory.map((row) => ({
        section: "spend_by_category",
        key: row.categoryCode,
        label: row.label,
        amount: row.amount,
      })),
      ...dashboard.spendByBusinessUnit.map((row) => ({
        section: "spend_by_business_unit",
        key: row.businessUnitCode,
        label: row.label,
        amount: row.amount,
      })),
    ];
    return toAnalyticsCsv(rows);
  }
}

export function createProcurementAnalyticsService() {
  return new ProcurementAnalyticsService();
}
