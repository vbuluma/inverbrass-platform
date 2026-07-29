/**
 * UX-001 — Platform UX component barrel exports.
 */

export {
  PlatformActionResultDisplay,
  toSimpleResult,
} from "@/components/platform/platform-action-result";
export {
  PlatformCompletionCard,
  type PlatformCompletionSummaryItem,
} from "@/components/platform/platform-completion-card";
export {
  PlatformCompletionMeter,
  type CompletionItem,
} from "@/components/platform/platform-completion-meter";
export {
  PlatformConfirmDialog,
  PlatformConfirmDialogHost,
  useConfirmAction,
} from "@/components/platform/platform-confirm-dialog";
export { PlatformDocumentPreview, type PlatformDocumentPreviewItem } from "@/components/platform/platform-document-preview";
export {
  PlatformEnterpriseDashboardHeader,
  timeBasedGreeting,
} from "@/components/platform/platform-enterprise-dashboard-header";
export { PlatformEmptyState } from "@/components/platform/platform-empty-state";
export {
  PlatformSearchState,
  type PlatformSearchStateStatus,
} from "@/components/platform/platform-search-state";
export {
  PlatformFavoriteButton,
  useFavorites,
  type FavoriteEntityType,
  type PlatformFavorite,
} from "@/components/platform/platform-favorites";
export {
  PlatformGlobalSearchShell,
  PlatformGlobalSearchTrigger,
} from "@/components/platform/platform-global-search-shell";
export {
  PlatformKpiCard,
  PlatformKpiGrid,
  type PlatformKpiMetric,
} from "@/components/platform/platform-kpi-card";
export {
  individualCreatedNextActions,
  organizationCreatedNextActions,
  partyCreatedNextActions,
  documentUploadedNextActions,
  identityRegulatoryOnboardingNextActions,
  contactCreatedNextActions,
  addressCreatedNextActions,
  groupCreatedNextActions,
  relationshipCreatedNextActions,
} from "@/components/platform/platform-next-actions";
export { useNotifications, type PlatformNotification, type PlatformNotificationSeverity } from "@/components/platform/use-notifications";
export {
  PlatformNotificationBell,
  PlatformNotificationCenter,
} from "@/components/platform/platform-notification-center";
export {
  PlatformProcessingButton,
  PlatformProcessingIndicator,
  PROCESSING_LABELS,
} from "@/components/platform/platform-processing-button";
export { PlatformQuickActionsCard } from "@/components/platform/platform-quick-actions-card";
export {
  PlatformRecentActivityCard,
  type RecentActivityItem,
} from "@/components/platform/platform-recent-activity-card";
export {
  PlatformRecommendationsCard,
  type PlatformRecommendation,
} from "@/components/platform/platform-recommendations-card";
export { PlatformStickyActionBar } from "@/components/platform/platform-sticky-action-bar";
export {
  PlatformTabPanel,
  PlatformTabs,
  type PlatformTabItem,
} from "@/components/platform/platform-tabs";
export { useUnsavedChangesGuard } from "@/components/platform/platform-unsaved-changes-guard";
export { PlatformFormActionFooter, PlatformInlineFormFeedback } from "@/components/platform/platform-form-action-footer";
export { PlatformWorkspaceHeader } from "@/components/platform/platform-workspace-header";
export {
  buildGroupQuickActions,
  buildPartyCompletionItems,
  buildPartyQuickActions,
  buildPartyRecommendations,
  toRecentActivityItems,
} from "@/components/platform/platform-workspace-helpers";
export { useAsyncAction } from "@/components/platform/use-async-action";
export { formatDraftSavedAt, readFormValues, useFormDraft } from "@/components/platform/use-form-draft";
export { usePanelFeedback } from "@/components/platform/platform-panel-feedback";
export { usePlatformAction } from "@/components/platform/use-platform-action";
