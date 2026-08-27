/**
 * ENG-003k — Dynamic product module UI labels from business terminology.
 */

"use client";

import { useMemo } from "react";

import type { BusinessTerminology } from "@/core/industry-experience/business-terminology";
import { useBusinessTerminology } from "@/core/industry-experience/business-terminology-context";

export function offeringsHubBreadcrumb(terminology: BusinessTerminology) {
  return {
    label: terminology.navigation.breadcrumbOfferings,
    href: "/products",
  } as const;
}

export function buildProductDashboardLabels(terminology: BusinessTerminology) {
  const { offerings, variants, bundles, categories, digitalCatalogue, attributes, units } =
    terminology;

  return {
    pageTitle: offerings.catalogueTitle,
    hubTitle: offerings.hubTitle,
    kpiHeading: offerings.plural,
    totalLabel: `Total ${offerings.plural}`,
    byTypeHeading: `By ${offerings.singular} Type`,
    createLabel: offerings.createLabel,
    registerLabel: offerings.registerLabel,
    searchPlaceholder: offerings.searchPlaceholder,
    searchAriaLabel: `Search ${offerings.plural.toLowerCase()}`,
    emptyTitle: offerings.emptyTitle,
    backLabel: terminology.navigation.backToOfferings,
    quickActions: {
      register: offerings.registerLabel,
      classifications: categories.plural,
      attributes: attributes.moduleName,
      variants: variants.moduleName,
      bundles: bundles.moduleName,
      digitalCatalogue: digitalCatalogue.label,
      units: units.moduleName,
      lifecycle: terminology.lifecycle.moduleName,
      pricing: terminology.pricing.moduleName,
      governance: terminology.governance.moduleName,
      analytics: terminology.analytics.moduleName,
    },
  } as const;
}

export function buildVariantUiLabels(terminology: BusinessTerminology) {
  const { variants, offerings, navigation, attributes } = terminology;

  return {
    moduleName: variants.moduleName,
    dashboardTitle: variants.moduleName,
    dashboardDescription: `Manage sellable versions of ${offerings.plural.toLowerCase()} with distinguishing attributes.`,
    registrationTitle: variants.registerLabel,
    registrationDescription: `Create a new ${variants.singular.toLowerCase()} with a unique code and distinguishing attribute values.`,
    workspaceTitle: variants.workspaceTitle,
    metricsTotal: `Total ${variants.plural}`,
    metricsActive: "Active",
    metricsDraft: "Draft",
    metricsArchived: "Archived",
    metricsParentOfferings: `${offerings.plural}`,
    metricsRecent: "Recently Updated",
    productPanelHeading: variants.plural,
    productPanelDescription: `Sellable versions of this ${offerings.singular.toLowerCase()}. ${variants.plural} are optional.`,
    timelineHeading: "Timeline",
    auditHeading: "Audit History",
    quickActionRegister: variants.registerLabel,
    cloneAction: `Clone ${variants.singular}`,
    backLabel: navigation.backToOfferings,
    backToModule: `Back to ${variants.moduleName.toLowerCase()}`,
    searchPlaceholder: `Search ${variants.plural.toLowerCase()}…`,
    workspaceTabs: {
      overview: "Overview",
      attributes: attributes.panelTitle,
      timeline: "Timeline",
      auditHistory: "Audit History",
    },
  } as const;
}

export function buildBundleUiLabels(terminology: BusinessTerminology) {
  const { bundles, offerings, navigation, pricing, analytics } = terminology;

  return {
    moduleName: bundles.moduleName,
    singular: bundles.singular,
    plural: bundles.plural,
    dashboardTitle: bundles.moduleName,
    dashboardDescription: `Combine ${offerings.plural.toLowerCase()} into packaged ${bundles.plural.toLowerCase()}.`,
    registrationTitle: bundles.registerLabel,
    registrationDescription: `Define bundle details, select ${offerings.plural.toLowerCase()}, configure quantities, and review.`,
    workspaceTitle: bundles.workspaceTitle,
    metricsTotal: `Total ${bundles.plural}`,
    metricsActive: "Active",
    metricsDraft: "Draft",
    metricsArchived: "Archived",
    metricsRecent: "Recently Updated",
    productPanelDescription: `Bundles and packages that include this ${offerings.singular.toLowerCase()} as a line item.`,
    timelineHeading: "Timeline",
    auditHeading: "Audit History",
    itemsHeading: `${bundles.singular} Items`,
    itemsDescription: `${offerings.plural} and ${terminology.variants.plural.toLowerCase()} that compose this ${bundles.singular.toLowerCase()}.`,
    pricingPlaceholderTitle: `${pricing.moduleName} — Coming Soon`,
    pricingPlaceholderDescription: `Bundle pricing calculations will be delivered by the ${pricing.moduleName} Engine.`,
    analyticsPlaceholderTitle: `${analytics.moduleName} — Coming Soon`,
    analyticsPlaceholderDescription:
      "Bundle performance analytics will be delivered in a future Build Pack.",
    quickActionRegister: bundles.registerLabel,
    backLabel: navigation.backToOfferings,
    backToModule: `Back to ${bundles.moduleName.toLowerCase()}`,
    selectItemsStep: `Select ${offerings.plural}`,
    searchPlaceholder: `Search ${bundles.plural.toLowerCase()}…`,
    registrationSteps: {
      details: `${bundles.singular} Details`,
      "select-products": `Select ${offerings.plural}`,
      configure: "Configure Quantities",
      review: "Review",
    },
    workspaceTabs: {
      overview: "Overview",
      bundleItems: `${bundles.singular} Items`,
      timeline: "Timeline",
      auditHistory: "Audit History",
      pricing: pricing.moduleName,
      analytics: analytics.moduleName,
    },
    workspaceAriaLabel: `${bundles.singular} workspace sections`,
    overviewTitle: "Overview",
    overviewDescription: `${bundles.singular} identity, availability, and pricing placeholders.`,
    bundleCodeLabel: `${bundles.singular} code`,
    bundleNameLabel: `${bundles.singular} name`,
    bundleDescriptionLabel: "Description",
    saveChangesLabel: "Save changes",
    emptyItemsTitle: "No items yet",
    emptyItemsDescription: `Add active ${offerings.plural.toLowerCase()} to compose this ${bundles.singular.toLowerCase()}.`,
    searchProductsPlaceholder: `Search ${offerings.plural.toLowerCase()}…`,
    archiveConfirmTitle: `Archive ${bundles.singular.toLowerCase()}?`,
    archiveConfirmDescription: `Archived ${bundles.plural.toLowerCase()} cannot be modified or sold.`,
    archiveConfirmLabel: "Archive",
    activateLabel: "Activate",
    suspendLabel: "Suspend",
    archiveLabel: "Archive",
    registrationCompleteTitle: `${bundles.singular} registered`,
  } as const;
}

export function buildCatalogueStructureUiLabels(terminology: BusinessTerminology) {
  const { categories, offerings, navigation } = terminology;

  return {
    moduleName: categories.moduleName,
    dashboardTitle: categories.moduleName,
    dashboardSubtitle: `Define how your ${offerings.hubTitle.toLowerCase()} catalogue is organised.`,
    workspaceLabel: `${categories.moduleName} Workspace`,
    categoriesHeading: categories.plural,
    primaryAssignment: categories.primaryLabel,
    additionalAssignments: `Additional ${categories.plural}`,
    assignCategory: categories.assignLabel,
    createCategory: categories.createLabel,
    childNodesHeading: categories.childLabel,
    breadcrumbRoot: categories.moduleName,
    timelineHeading: `${categories.moduleName} Timeline`,
    nodeType: "Structure Type",
    industryVisibility: "Industry Visibility",
    industryAll: "All Industries",
    icon: "Icon",
    metricsProducts: offerings.plural,
    metricsActiveProducts: `Active ${offerings.plural}`,
    metricsArchivedProducts: `Archived ${offerings.plural}`,
    metricsChildren: "Children",
    assignedProducts: offerings.assignedLabel,
    backToOfferings: navigation.backToOfferings,
    backToCatalogue: `Back to ${categories.moduleName.toLowerCase()}`,
    workspaceAriaLabel: `${categories.moduleName} workspace sections`,
    workspaceTabs: {
      overview: "Overview",
      children: categories.childLabel,
      "assigned-products": offerings.assignedLabel,
      timeline: "Timeline",
      "audit-history": "Audit History",
    },
  } as const;
}

export function buildAttributeUiLabels(terminology: BusinessTerminology) {
  const { attributes, offerings, navigation } = terminology;
  return {
    moduleName: attributes.moduleName,
    dashboardTitle: attributes.moduleName,
    dashboardDescription: `Configure metadata-driven characteristics for ${offerings.plural.toLowerCase()} without schema changes.`,
    definitionWorkspaceTitle: `${attributes.moduleName} Definition Workspace`,
    backLabel: navigation.backToOfferings,
    backToModule: `Back to ${attributes.moduleName.toLowerCase()}`,
    panelHeading: attributes.panelTitle,
    panelDescription: `Attribute definitions for ${offerings.plural.toLowerCase()}.`,
    valuesUpdatedMessage: `${offerings.singular} attribute values updated.`,
    groupRegistrationTitle: "Create Attribute Group",
    groupRegistrationDescription:
      "Organize related attribute definitions into reusable groups.",
    definitionRegistrationTitle: "Create Attribute Definition",
    definitionRegistrationDescription:
      "Define a configurable field with data type, validation, and display rules.",
    quickActionGroup: "Create Group",
    quickActionDefinition: "Create Definition",
    metricsTotalGroups: "Attribute Groups",
    metricsTotalAttributes: "Total Attributes",
    metricsActive: "Active",
    metricsArchived: "Archived",
    assignmentHeading: "Scope Assignment",
    assignmentDescription: `Assign attributes to ${offerings.singular.toLowerCase()} types or catalogue classifications.`,
    timelineHeading: "Timeline",
    auditHeading: "Audit History",
    definitionWorkspaceTabs: {
      overview: "Overview",
      options: "Options",
      assignment: "Scope Assignment",
      timeline: "Timeline",
      auditHistory: "Audit History",
    },
    workspaceAriaLabel: `${attributes.moduleName} workspace sections`,
  } as const;
}

export function buildCatalogueUiLabels(terminology: BusinessTerminology) {
  const { digitalCatalogue, offerings, navigation } = terminology;
  const offeringLower = offerings.singular.toLowerCase();
  const offeringsLower = offerings.plural.toLowerCase();
  return {
    moduleName: digitalCatalogue.label,
    dashboardTitle: digitalCatalogue.dashboardTitle,
    dashboardDescription: `Publish ${offeringsLower} to channels with visibility rules — presentation only, not e-commerce.`,
    workspaceTitle: `${digitalCatalogue.label} Workspace`,
    publishedLabel: digitalCatalogue.publishedLabel,
    searchHeading: `Search ${digitalCatalogue.publishedLabel}`,
    metricsPublished: `Published ${offerings.plural}`,
    metricsDraft: "Unpublished Active",
    metricsScheduled: "Scheduled",
    metricsFeatured: "Featured",
    metricsChannels: "Channels",
    productPanelHeading: "Catalogue Publishing",
    productPanelDescription: `Control where this ${offeringLower} appears across digital channels.`,
    openWorkspace: "Open Catalogue Workspace",
    notPublishableTitle: `${offerings.singular} not publishable`,
    notPublishableDescription: `Only active ${offeringsLower} can be published to digital channels.`,
    notPublishableActivateDescription: `Only active ${offeringsLower} can be published. Activate the ${offeringLower} first.`,
    productWorkspaceLink: `${offerings.singular} workspace`,
    openProductWorkspace: `Open ${offeringLower} workspace`,
    publicationHeading: "Channel Publications",
    publicationDescription:
      "Configure publishing, visibility, and scheduling for each channel.",
    previewHeading: "Channel Preview",
    previewDescription: "Mock layout previews — real rendering deferred to channel apps.",
    backLabel: navigation.backToOfferings,
    backToModule: `Back to ${digitalCatalogue.label.toLowerCase()}`,
    workspaceTabs: {
      publications: "Publications",
      preview: "Preview",
    },
    workspaceAriaLabel: `${digitalCatalogue.label} workspace sections`,
  } as const;
}

export function buildUnitUiLabels(terminology: BusinessTerminology) {
  const { units, navigation } = terminology;
  const unitSingular = units.moduleName.endsWith("s")
    ? units.moduleName.slice(0, -1)
    : units.moduleName;

  return {
    moduleName: units.moduleName,
    dashboardTitle: units.moduleName,
    dashboardDescription: `Standardize quantities, conversions, and precision across your catalogue.`,
    registrationTitle: `Register ${unitSingular}`,
    registrationDescription: `Define a measurable unit with category, conversion factor, and precision rules.`,
    workspaceTitle: `${units.moduleName} Workspace`,
    metricsTotal: `Total ${units.moduleName}`,
    metricsActive: `Active ${units.moduleName}`,
    metricsCategories: "Categories",
    metricsRecent: "Recently Updated",
    conversionHeading: "Conversion Rules",
    conversionDescription: "Convert between units in the same category using configured factors.",
    timelineHeading: "Timeline",
    auditHeading: "Audit History",
    quickActionRegister: `Register ${unitSingular}`,
    quickActionCategories: "Categories",
    backLabel: navigation.backToOfferings,
    backToModule: `Back to ${units.moduleName.toLowerCase()}`,
    workspaceTabs: {
      overview: "Overview",
      conversionRules: "Conversion Rules",
      timeline: "Timeline",
      auditHistory: "Audit History",
    },
    workspaceAriaLabel: `${units.moduleName} workspace sections`,
    archiveConfirmTitle: `Archive ${unitSingular.toLowerCase()}?`,
    archiveConfirmDescription: `Archived ${units.moduleName.toLowerCase()} cannot be assigned to new offerings and become read-only.`,
    archiveConfirmLabel: "Archive",
    activateLabel: "Activate",
    suspendLabel: "Suspend",
    archiveLabel: "Archive",
    saveChangesLabel: "Save changes",
  } as const;
}

export function buildPricingUiLabels(terminology: BusinessTerminology) {
  const { pricing, offerings, entities, navigation } = terminology;
  const offeringLower = offerings.singular.toLowerCase();
  const offeringsLower = offerings.plural.toLowerCase();
  const customerGroup = `${entities.customer.singular} Group`;
  const customerGroups = `${entities.customer.singular} Groups`;

  return {
    moduleName: pricing.moduleName,
    dashboardTitle: pricing.dashboardTitle,
    dashboardDescription: `Manage pricing catalogues and ${offeringsLower} prices across channels, segments, and regions.`,
    backLabel: navigation.backToOfferings,
    panelTitle: pricing.moduleName,
    panelDescription: `Configure how this ${offeringLower} is sold. Prices are kept separate from the ${offeringLower} master record.`,
    commercialRulesHint:
      "Commercial rules such as discounts, promotions, and taxes will be added in future capabilities.",
    sectionActive: "Active Prices",
    sectionFuture: "Future Prices",
    sectionExpired: "Expired Prices",
    sectionHistory: "Price History",
    sectionCatalogues: "Pricing Catalogues",
    metricsActive: "Active Prices",
    metricsFuture: "Future Prices",
    metricsExpired: "Expired Prices",
    metricsCatalogues: "Pricing Catalogues",
    quickActionAddPrice: "Add Price",
    quickActionAddCatalogue: "Add Catalogue",
    quickActionCompare: "Compare Prices",
    searchHeading: "Search Pricing",
    searchDescription: `Search by ${offeringLower}, catalogue, currency, segment, channel, or region.`,
    searchPlaceholder: `Search by ${offeringLower}, catalogue, ${customerGroup.toLowerCase()}, channel, or region…`,
    searchButton: "Search",
    searchEmptyTitle: "No pricing records found",
    searchEmptyHints: [
      "Different keywords",
      "Removing filters",
      "Adding a new price",
    ] as const,
    addPriceTitle: "Add Price",
    editPriceTitle: "Edit Price",
    copyPriceTitle: "Copy Price",
    compareTitle: "Compare Prices",
    compareDescription: (count: number) =>
      `Comparing ${count} price records across dimensions.`,
    closeComparison: "Close Comparison",
    activateConfirm: "Activate this price?",
    activateConfirmDescription:
      "This price will become active for its dimension combination.",
    expireConfirm: "Expire this price?",
    expireConfirmDescription: "Expired prices become read-only.",
    archiveConfirm: "Archive this price?",
    archiveConfirmDescription:
      "Archived prices remain in history but cannot be reactivated.",
    noActivePrices: `No pricing configured for this ${offerings.singular}.`,
    noActivePricesDescription: `Add a price to define how this ${offeringLower} is sold.`,
    noFuturePrices: "No future prices scheduled.",
    noExpiredPrices: "No expired prices.",
    noHistory: "No price history yet.",
    noHistoryDescription: "Price changes will appear here as they are recorded.",
    noCataloguesTitle: "No pricing catalogues yet",
    noCataloguesDescription: `Create a pricing catalogue before assigning prices to ${offeringsLower}.`,
    noCustomerGroupsFound: `No ${customerGroups} found.`,
    catalogueCode: "Catalogue Code",
    catalogueName: "Catalogue Name",
    currency: "Currency",
    unitPrice: "Unit Price",
    price: "Price",
    minimumPrice: "Minimum Price",
    maximumPrice: "Maximum Price",
    pricingMethod: "Pricing Method",
    customerSegment: customerGroup,
    customerGroups,
    salesChannel: "Sales Channel",
    region: "Region",
    effectiveFrom: "Effective From",
    effectiveTo: "Effective To",
    effectiveDate: "Effective Date",
    effective: "Effective",
    status: "Status",
    offering: offerings.singular,
    offerings: offerings.plural,
    catalogue: "Catalogue",
    selectCatalogue: "Select catalogue",
    savePrice: "Save Price",
    saving: "Saving…",
    cancel: "Cancel",
    activate: "Activate",
    expire: "Expire",
    archive: "Archive",
    copy: "Copy",
    compare: "Compare",
    edit: "Edit",
    actions: "Actions",
    method: "Method",
    segment: customerGroup,
    channel: "Channel",
    updated: "Updated",
    quickActionsHeading: "Quick Actions",
    activeCount: (count: number) => `${count} active`,
    futureCount: (count: number) => `${count} scheduled`,
    expiredCount: (count: number) => `${count} expired`,
    totalCount: (count: number) => `${count} total records`,
    cataloguesSummary: (active: number, total: number) =>
      `${active} active of ${total} catalogues`,
    selectPricingCatalogue: "Select a pricing catalogue.",
    selectTwoPricesToCompare: "Select at least two prices to compare.",
    priceCreatedTitle: "Price created.",
    priceCreatedMessage: `A new price record was added for this ${offeringLower}.`,
    priceUpdatedTitle: "Price updated.",
    priceUpdatedMessage: `Pricing updated for ${offerings.singular}.`,
    priceActivatedTitle: "Price activated.",
    priceActivatedMessage: "The price is now active.",
    priceExpiredTitle: "Price expired.",
    priceExpiredMessage: "The price is now expired.",
    priceArchivedTitle: "Price archived.",
    priceArchivedMessage: "The price was archived.",
    priceCopiedTitle: "Price copied.",
    priceCopiedMessage: "A draft copy of the price was created.",
    pricingAssignedToOffering: `Pricing assigned to ${offerings.singular}.`,
  } as const;
}

export function buildGovernanceUiLabels(terminology: BusinessTerminology) {
  const { governance, offerings, navigation } = terminology;
  const offeringLower = offerings.singular.toLowerCase();
  const offeringsLower = offerings.plural.toLowerCase();

  return {
    moduleName: governance.moduleName,
    dashboardTitle: governance.dashboardTitle,
    dashboardDescription: `Enterprise governance, ownership, and readiness across the ${offeringsLower} catalogue.`,
    backLabel: navigation.backToOfferings,
    offeringsGoverned: `${offerings.plural} Governed`,
    panelTitle: governance.moduleName,
    panelDescription: `Ownership, readiness score, and validation results for this ${offeringLower}.`,
    sectionOwnership: "Ownership",
    sectionGovernanceStatus: "Governance Status",
    sectionReadinessScore: "Readiness Score",
    sectionReadinessChecklist: "Readiness Checklist",
    sectionValidationResults: "Validation Results",
    sectionGovernanceHistory: "Governance History",
    businessOwner: "Responsible Business Owner",
    technicalOwner: "Technical Owner",
    offeringSteward: `${offerings.singular} Steward`,
    governanceStatus: "Governance Status",
    readinessScore: "Readiness Score",
    lastValidation: "Last Validation",
    locked: "Governance Locked",
    notes: "Notes",
    runValidation: "Run Validation",
    saveOwnership: "Save Ownership",
    saveNotes: "Save Notes",
    lockGovernance: "Lock Governance",
    unlockGovernance: "Unlock Governance",
    noHistory: "No governance changes recorded yet.",
    noChecklist: "No checklist definitions configured.",
    searchPlaceholder: `Search ${offeringsLower}, owners, or status…`,
    readyCount: "Ready for Release",
    nonCompliantCount: "Non-Compliant",
    averageReadiness: "Average Readiness",
    mandatoryMissing: "Mandatory requirements missing",
    pendingModule: "Pending module integration",
    ownershipSectionDescription: `Assign responsible owners and stewards for this ${offeringLower}.`,
    stewardChangedSummary: `${offerings.singular} Steward changed.`,
    emptyRecordsDescription: `Open an ${offeringLower} workspace and run governance validation to begin.`,
    recentActivityDescription: `Governance updates will appear here as ${offeringsLower} are validated.`,
  } as const;
}

export function buildAnalyticsUiLabels(terminology: BusinessTerminology) {
  const { analytics, offerings, navigation } = terminology;
  const offeringsLower = offerings.plural.toLowerCase();
  return {
    moduleName: analytics.moduleName,
    dashboardTitle: analytics.dashboardTitle,
    dashboardDescription: `Measure ${offeringsLower} performance with configurable KPIs and immutable metric snapshots.`,
    backLabel: navigation.backToOfferings,
    offeringsTracked: `${offerings.plural} Tracked`,
    compareOfferings: `Compare ${offerings.plural}`,
    metricsTotal: "Metric Definitions",
    snapshotsTotal: "Snapshots",
    panelTitle: analytics.moduleName,
    panelDescription: `Operational analytics for this ${offerings.singular.toLowerCase()}. Business transaction metrics will populate as future Build Packs connect.`,
    sectionPerformanceSummary: "Performance Summary",
    sectionKpiCards: "KPI Cards",
    sectionOfferingHealth: `${offerings.singular} Health`,
    sectionLifecycle: "Lifecycle Summary",
    sectionCompliance: "Compliance Summary",
    sectionCommercial: "Commercial Summary",
    sectionRelationships: "Relationship Summary",
    sectionPricing: "Pricing Summary",
    sectionRecentActivity: "Recent Activity",
    sectionTrends: "Trends",
    refreshAnalytics: "Refresh Analytics",
    exportAnalytics: "Export",
    exportPlaceholder:
      "Export will generate reports when the Reporting Engine integration is available.",
    filterDateFrom: "From",
    filterDateTo: "To",
    filterCategory: "Metric Category",
    filterPeriod: "Snapshot Period",
    noSnapshots: "No metric snapshots yet.",
    noSnapshotsHint: "Refresh analytics to generate the first snapshot.",
    pendingMetric: "Awaiting module data",
    searchPlaceholder: `Search metrics or ${offeringsLower}…`,
    lastRefreshed: "Last Refreshed",
  } as const;
}

export function buildLifecycleUiLabels(terminology: BusinessTerminology) {
  const { offerings, lifecycle, navigation } = terminology;
  const offeringLower = offerings.singular.toLowerCase();
  return {
    moduleName: lifecycle.moduleName,
    dashboardTitle: `${offerings.plural} Lifecycle`,
    dashboardDescription: `Operational view of ${offerings.plural.toLowerCase()} lifecycle states across the catalogue.`,
    panelTitle: lifecycle.panelTitle,
    backLabel: navigation.backToOfferings,
    recentActivity: `${offerings.plural} with recent lifecycle activity`,
    recentlyChangedTitle: "Recently Changed",
    approvedMessage: `${offerings.singular} approved.`,
    activatedMessage: `${offerings.singular} activated.`,
    suspendedMessage: `${offerings.singular} suspended.`,
    reactivatedMessage: `${offerings.singular} reactivated.`,
    deprecatedMessage: `${offerings.singular} deprecated.`,
    archivedMessage: `${offerings.singular} archived.`,
    nowActiveMessage: `${offerings.singular} is now active.`,
    hasBeenSuspendedMessage: `${offerings.singular} has been suspended.`,
    hasBeenArchivedMessage: `${offerings.singular} has been archived.`,
    updatedTitle: `${offerings.singular} updated`,
    saveErrorTitle: `Could not save ${offeringLower}`,
  } as const;
}

export function buildProductWorkspaceLabels(terminology: BusinessTerminology) {
  const { offerings, navigation, variants, bundles, categories, lifecycle, documents, relationships } =
    terminology;

  return {
    hubBreadcrumb: offeringsHubBreadcrumb(terminology),
    backLabel: navigation.backToOfferings,
    workspaceLabel: offerings.workspaceTitle,
    codeLabel: offerings.codeLabel,
    nameLabel: offerings.nameLabel,
    typeLabel: offerings.typeLabel,
    workspaceAriaLabel: `${offerings.singular} workspace sections`,
    timelineTitle: `${offerings.singular} Timeline`,
    timelineEmptyDescription: `${offerings.singular} lifecycle and registration events will appear here.`,
    formSections: {
      identityHeading: "Identity",
      lifecycleHeading: "Lifecycle",
      ownershipHeading: "Ownership",
      capabilitiesHeading: "Capabilities",
      capabilitiesDescription:
        "Describe how this offering may be used across channels. This is not inventory or pricing.",
      migrationHeading: "Migration",
      responsibleBusinessOwner: "Responsible Business Owner",
      responsibleBusinessOwnerHint:
        "Executive accountability for this offering. Delivery, reporting, and operational owners arrive in IP-013.",
    },
    tabs: {
      overview: "Overview",
      classification: categories.moduleName,
      units: terminology.units.moduleName,
      attributes: "Attributes",
      variants: variants.plural,
      bundles: bundles.plural,
      catalogue: terminology.digitalCatalogue.label,
      lifecycle: lifecycle.moduleName,
      documents: documents.moduleName,
      compliance: "Compliance",
      timeline: "Timeline",
      auditHistory: "Audit History",
      pricing: terminology.pricing.moduleName,
      analytics: terminology.analytics.moduleName,
      governance: terminology.governance.moduleName,
      relationships: relationships.moduleName,
    },
  } as const;
}

export function buildRegistrationFormLabels(terminology: BusinessTerminology) {
  const { offerings, navigation } = terminology;
  const offeringLower = offerings.singular.toLowerCase();
  return {
    catalogueLabel: offerings.plural,
    singularLabel: offerings.singular,
    codeLabel: offerings.codeLabel,
    nameLabel: offerings.nameLabel,
    typeLabel: offerings.typeLabel,
    backLabel: navigation.backToOfferings,
    pageTitle: offerings.registerLabel,
    createErrorTitle: `Could not create ${offeringLower}`,
    formSections: {
      identityHeading: "Identity",
      lifecycleHeading: "Lifecycle",
      ownershipHeading: "Ownership",
      capabilitiesHeading: "Capabilities",
      capabilitiesDescription:
        "Describe how this offering may be used across channels. This is not inventory or pricing.",
      migrationHeading: "Migration",
      responsibleBusinessOwner: "Responsible Business Owner",
      responsibleBusinessOwnerHint:
        "Executive accountability for this offering. Delivery, reporting, and operational owners arrive in IP-013.",
    },
  } as const;
}

export function buildRelationshipPanelLabels(terminology: BusinessTerminology) {
  const { offerings, relationships } = terminology;
  return {
    searchPlaceholder: relationships.searchPlaceholder,
    searchProductsLabel: `Search ${offerings.plural}`,
    productNameOrCode: `${offerings.singular} name or code`,
    requiredOfferings: `Required ${offerings.plural}`,
    optionalOfferings: `Optional ${offerings.plural}`,
    alternativeOfferings: `Alternative ${offerings.plural}`,
  } as const;
}

export function buildActionMessages(terminology: BusinessTerminology) {
  const { offerings, variants, bundles, units, categories, attributes } = terminology;

  return {
    offeringCreated: `${offerings.singular} created`,
    offeringUpdated: `${offerings.singular} updated`,
    variantUpdated: `${variants.singular} updated`,
    variantCloned: `${variants.singular} cloned`,
    variantRegistered: `${variants.singular} registered`,
    variantAttributesSaved: `${variants.singular} attribute overrides updated.`,
    bundleCreated: `${bundles.singular} created`,
    bundleUpdated: `${bundles.singular} updated`,
    bundleActivated: `${bundles.singular} activated.`,
    bundleSuspended: `${bundles.singular} suspended.`,
    bundleArchived: `${bundles.singular} archived.`,
    bundleItemAdded: (itemName: string) => `${itemName} added.`,
    bundleItemRemoved: `${bundles.singular} line item removed.`,
    unitUpdated: `${units.moduleName.replace(/s$/i, "")} updated`,
    unitRegistered: `${units.moduleName.replace(/s$/i, "")} registered`,
    unitActivated: `${units.moduleName.replace(/s$/i, "")} activated.`,
    unitSuspended: `${units.moduleName.replace(/s$/i, "")} suspended.`,
    unitArchived: `${units.moduleName.replace(/s$/i, "")} archived`,
    categoryUpdated: `${categories.singular} updated`,
    categoryArchived: `${categories.singular} archived`,
    attributesSaved: "Attributes saved",
    lifecycleUpdated: "Lifecycle updated",
    publicationSaved: "Publication saved",
    publicationSavedDetail: "Channel settings updated.",
    attributeDefinitionUpdated: `${attributes.moduleName} definition updated.`,
    attributeOptionAdded: "Select option created.",
    attributeAssigned: `${attributes.moduleName} assigned to ${offerings.singular.toLowerCase()} type.`,
    attributeScopeRemoved: "Scope assignment removed.",
    saved: "Saved",
    assigned: "Assigned",
    removed: "Removed",
    optionAdded: "Option added",
    changesSaved: "Changes saved successfully.",
    statusUpdated: "Status updated",
    statusUpdatedDetail: "Status updated.",
    openingClone: `Opening cloned ${variants.singular.toLowerCase()}…`,
    couldNotSave: "Could not save",
    couldNotAddItem: "Could not add item",
    couldNotUpdateItem: "Could not update item",
    couldNotRemoveItem: "Could not remove item",
    couldNotAddOption: "Could not add option",
    couldNotAssign: "Could not assign",
    couldNotRemove: "Could not remove",
    couldNotSavePublication: "Could not save publication",
    couldNotSaveAttributes: "Could not save attributes",
    actionFailed: "Action failed",
    cloneFailed: "Clone failed",
    redirectingToWorkspace: "Redirecting to workspace…",
    savedSuccessfully: "Saved successfully.",
  } as const;
}

export function buildOnboardingStepLabels(terminology: BusinessTerminology) {
  const { entities } = terminology;
  return {
    branchStepTitle: entities.branch.plural,
    employeeStepTitle: entities.employee.plural,
    branchEntityLabel: entities.branch.singular,
    employeeEntityLabel: entities.employee.singular,
    branchNameLabel: `${entities.branch.singular} name`,
    branchCodeLabel: `${entities.branch.singular} code`,
    branchTypeLabel: `${entities.branch.singular} type`,
    branchEmailLabel: `${entities.branch.singular} email (optional)`,
    employeeBranchLabel: entities.branch.singular,
  } as const;
}

export type ProductUiLabels = ReturnType<typeof buildAllProductUiLabels>;

export function buildAllProductUiLabels(terminology: BusinessTerminology) {
  return {
    dashboard: buildProductDashboardLabels(terminology),
    variant: buildVariantUiLabels(terminology),
    bundle: buildBundleUiLabels(terminology),
    catalogueStructure: buildCatalogueStructureUiLabels(terminology),
    attribute: buildAttributeUiLabels(terminology),
    catalogue: buildCatalogueUiLabels(terminology),
    unit: buildUnitUiLabels(terminology),
    pricing: buildPricingUiLabels(terminology),
    governance: buildGovernanceUiLabels(terminology),
    analytics: buildAnalyticsUiLabels(terminology),
    lifecycle: buildLifecycleUiLabels(terminology),
    workspace: buildProductWorkspaceLabels(terminology),
    registration: buildRegistrationFormLabels(terminology),
    relationships: buildRelationshipPanelLabels(terminology),
    actions: buildActionMessages(terminology),
    onboarding: buildOnboardingStepLabels(terminology),
  };
}

export function useProductUiLabels(): ProductUiLabels {
  const terminology = useBusinessTerminology();
  return useMemo(() => buildAllProductUiLabels(terminology), [terminology]);
}

export function useBusinessTerminologyLabels() {
  return useBusinessTerminology();
}
