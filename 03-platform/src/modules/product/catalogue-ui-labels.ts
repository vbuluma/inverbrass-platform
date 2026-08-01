/**
 * Purpose:
 * User-facing labels for Digital Catalogue Engine UI.
 *
 * Implementation Package:
 * BP-003 / IP-007 – Digital Catalogue Engine
 */

export const CATALOGUE_UI_LABELS = {
  moduleName: "Digital Catalogue",
  dashboardTitle: "Digital Catalogue",
  dashboardDescription:
    "Publish offerings to channels with visibility rules — presentation only, not e-commerce.",
  workspaceTitle: "Catalogue Workspace",
  metricsPublished: "Published Products",
  metricsDraft: "Unpublished Active",
  metricsScheduled: "Scheduled",
  metricsFeatured: "Featured",
  metricsChannels: "Channels",
  publicationHeading: "Channel Publications",
  publicationDescription:
    "Configure publishing, visibility, and scheduling for each channel.",
  productPanelHeading: "Catalogue Publishing",
  productPanelDescription:
    "Control where this offering appears across digital channels.",
  previewHeading: "Channel Preview",
  previewDescription: "Mock layout previews — real rendering deferred to channel apps.",
  quickActionManage: "Manage Catalogue",
  openWorkspace: "Open Catalogue Workspace",
} as const;

export const CATALOGUE_WORKSPACE_TABS = [
  { id: "publications", label: "Publications", available: true },
  { id: "preview", label: "Preview", available: true },
] as const;

export const CATALOGUE_PREVIEW_CHANNELS = [
  { id: "website", label: "Website" },
  { id: "mobile", label: "Mobile App" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "qr", label: "QR" },
  { id: "customer-portal", label: "Customer Portal" },
  { id: "partner-portal", label: "Partner Portal" },
] as const;
