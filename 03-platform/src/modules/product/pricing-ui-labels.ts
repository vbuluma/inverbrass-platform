/**
 * Purpose:
 * User-facing labels for Offering Pricing UI.
 *
 * Implementation Package:
 * BP-003 / IP-011 – Offering Pricing & Pricing Rules
 */

export const PRICING_UI_LABELS = {
  dashboardTitle: "Offering Pricing",
  dashboardDescription:
    "Manage pricing catalogues and offering prices across channels, segments, and regions.",
  panelTitle: "Pricing",
  panelDescription:
    "Configure how this offering is sold. Prices are kept separate from the offering master record.",
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
  searchPlaceholder: "Search by offering, catalogue, segment, channel, or region…",
  searchEmptyTitle: "No pricing records found",
  searchEmptyHints: [
    "Different keywords",
    "Removing filters",
    "Adding a new price",
  ],
  addPriceTitle: "Add Price",
  editPriceTitle: "Edit Price",
  copyPriceTitle: "Copy Price",
  compareTitle: "Compare Prices",
  activateConfirm: "Activate this price?",
  expireConfirm: "Expire this price?",
  archiveConfirm: "Archive this price?",
  noActivePrices: "No active prices configured.",
  noFuturePrices: "No future prices scheduled.",
  noExpiredPrices: "No expired prices.",
  noHistory: "No price history yet.",
  catalogueCode: "Catalogue Code",
  catalogueName: "Catalogue Name",
  currency: "Currency",
  unitPrice: "Unit Price",
  minimumPrice: "Minimum Price",
  maximumPrice: "Maximum Price",
  pricingMethod: "Pricing Method",
  customerSegment: "Customer Segment",
  salesChannel: "Sales Channel",
  region: "Region",
  effectiveFrom: "Effective From",
  effectiveTo: "Effective To",
  status: "Status",
  offering: "Offering",
  catalogue: "Catalogue",
  savePrice: "Save Price",
  activate: "Activate",
  expire: "Expire",
  archive: "Archive",
  copy: "Copy",
  compare: "Compare",
  edit: "Edit",
} as const;
