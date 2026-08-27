/**
 * ENG-003k — Party module UI labels derived from business terminology.
 */

"use client";

import { useMemo } from "react";

import type { BusinessTerminology } from "@/core/industry-experience/business-terminology";
import { useBusinessTerminology } from "@/core/industry-experience/business-terminology-context";

export function buildPartyDashboardLabels(terminology: BusinessTerminology) {
  const { entities } = terminology;

  return {
    dashboardTitle: `${entities.party.plural} Dashboard`,
    dashboardDescription: `Master repository for Individuals and Organizations.`,
    totalParties: `Total ${entities.party.plural}`,
    individuals: "Individuals",
    organizations: "Organizations",
    activeParties: `Active ${entities.party.plural}`,
    rolesHeading: "Roles",
    noRolesTitle: "No Roles Yet",
    noRolesDescription: `Assign ${entities.customer.singular}, ${entities.supplier.singular}, and other roles from a ${entities.party.singular} Workspace to populate this widget.`,
    viewParties: `View ${entities.party.plural}`,
    recentlyRegistered: "Recently Registered",
    registerParty: `Register ${entities.party.singular}`,
    noPartiesTitle: `No ${entities.party.plural} Yet`,
    noPartiesDescription:
      "Create an Individual or Organization to populate the master Party repository.",
    createIndividual: "Create Individual",
    createOrganization: "Create Organization",
    partyIdColumn: `${entities.party.singular} ID`,
    backToDashboard: "Back to dashboard",
    backToPartyDashboard: `Back to ${entities.party.plural} Dashboard`,
    addUnit: "Add Unit",
    savedSuccessfully: "Saved successfully.",
  } as const;
}

export function usePartyDashboardLabels() {
  const terminology = useBusinessTerminology();
  return useMemo(() => buildPartyDashboardLabels(terminology), [terminology]);
}
