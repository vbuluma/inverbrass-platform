/**
 * Purpose:
 * Party Workspace — Overview, Roles, and Contacts tabs; other tabs placeholders.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 * BP-002 / IP-002 – Party Roles
 * BP-002 / IP-003 – Contacts & Communication
 * BP-002 / IP-004 – Address Management
 * BP-002 / IP-005 – Organization Structure Engine (ENG-003c)
 * BP-002 / IP-006 – Party Relationships
 * BP-002 / IP-007 – Documents & Compliance
 * BP-002 / IP-008 – Party Groups & Membership
 * BP-002 / IP-010 – Party Timeline & Activity History
 * BP-002 / IP-011 – Enterprise Audit History
 * BP-002 / IP-012 – Party Communication & Consent Preferences
 */

"use client";

import { NetworkIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { SetBreadcrumbs } from "@/components/platform/breadcrumb-context";
import {
  PlatformFavoriteButton,
  PlatformFormActionFooter,
  PlatformProcessingButton,
  PlatformRecentActivityCard,
  PlatformRecommendationsCard,
  PlatformTabs,
  PlatformWorkspaceHeader,
  PROCESSING_LABELS,
  buildPartyCompletionItems,
  buildPartyQuickActions,
  buildPartyRecommendations,
  toRecentActivityItems,
  useAsyncAction,
  useFormDraft,
  useUnsavedChangesGuard,
} from "@/components/platform";
import { platformError, platformSuccess } from "@/core/platform/platform-action-helpers";
import type { PlatformActionResult } from "@/core/platform/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dateFieldValue, textFieldValue, useControlledForm } from "@/lib/forms";
import {
  activatePartyAction,
  archivePartyAction,
  suspendPartyAction,
  updatePartyAction,
} from "@/modules/party/actions/party-actions";
import { PartyAddressesPanel } from "@/modules/party/components/party-addresses-panel";
import { PartyOrganizationStructurePanel } from "@/modules/party/components/party-organization-structure-panel";
import { PartyContactsPanel } from "@/modules/party/components/party-contacts-panel";
import { PartyDocumentsPanel } from "@/modules/party/components/party-documents-panel";
import { PartyGroupsPanel } from "@/modules/party/components/party-groups-panel";
import { PartyAuditHistoryPanel } from "@/modules/party/components/party-audit-history-panel";
import { PartyCommunicationPreferencesPanel } from "@/modules/party/components/party-communication-preferences-panel";
import { PartyTimelinePanel } from "@/modules/party/components/party-timeline-panel";
import { PartyRelationshipsPanel } from "@/modules/party/components/party-relationships-panel";
import { PartyRolesPanel } from "@/modules/party/components/party-roles-panel";
import {
  FUTURE_TAB_MESSAGE,
  PARTY_STATUS_CODES,
  PARTY_TYPE_CODES,
  PARTY_WORKSPACE_TABS,
} from "@/modules/party/constants";
import type {
  PartyAddressesPanelView,
  OrganizationStructurePanelView,
  PartyContactsPanelView,
  PartyDetailView,
  PartyDocumentsPanelView,
  PartyGroupsPanelView,
  PartyTimelinePanelView,
  PartyAuditHistoryPanelView,
  PartyCommunicationPreferencesPanelView,
  PartyRegistrationCatalogues,
  PartyRelationshipsPanelView,
  PartyRolesPanelView,
} from "@/modules/party/types";

type PartyWorkspaceProps = {
  party: PartyDetailView;
  catalogues: PartyRegistrationCatalogues;
  roles: PartyRolesPanelView;
  contacts: PartyContactsPanelView;
  addresses: PartyAddressesPanelView;
  organizationStructure: OrganizationStructurePanelView;
  relationships: PartyRelationshipsPanelView;
  documents: PartyDocumentsPanelView;
  groups: PartyGroupsPanelView;
  timeline: PartyTimelinePanelView;
  auditHistory: PartyAuditHistoryPanelView;
  communicationPreferences: PartyCommunicationPreferencesPanelView;
  initialTab?: string;
  showAddOrganizationalUnit?: boolean;
};

function buildOverviewInitial(party: PartyDetailView) {
  return {
    displayName: textFieldValue(party.displayName),
    notes: textFieldValue(party.notes),
    dateOfBirth: dateFieldValue(party.individual?.dateOfBirth),
    gender: textFieldValue(party.individual?.gender),
    preferredLanguageCode: textFieldValue(party.individual?.preferredLanguageCode),
    registrationNumber: textFieldValue(party.organization?.registrationNumber),
    taxNumber: textFieldValue(party.organization?.taxNumber),
    industryCode: textFieldValue(party.organization?.industryCode),
    organizationTypeCode: textFieldValue(party.organization?.organizationTypeCode),
    website: textFieldValue(party.organization?.website),
  };
}

function formatDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function PartyWorkspace({
  party: initialParty,
  catalogues,
  roles,
  contacts,
  addresses,
  organizationStructure,
  relationships,
  documents,
  groups,
  timeline,
  auditHistory,
  communicationPreferences,
  initialTab = "overview",
  showAddOrganizationalUnit = false,
}: PartyWorkspaceProps) {
  const [party, setParty] = useState(initialParty);
  const [syncedInitialParty, setSyncedInitialParty] = useState(initialParty);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showAddUnit, setShowAddUnit] = useState(showAddOrganizationalUnit);
  const [overviewResult, setOverviewResult] = useState<PlatformActionResult | null>(
    null
  );
  const [headerResult, setHeaderResult] = useState<PlatformActionResult | null>(
    null
  );
  const [isDirty, setIsDirty] = useState(false);
  const [activeAction, setActiveAction] = useState<"overview" | "header" | null>(
    null
  );
  const overviewFormRef = useRef<HTMLFormElement>(null);
  const { isProcessing, run } = useAsyncAction();
  const {
    draftValues: overviewDraft,
    saveDraft: saveOverviewDraft,
    clearDraft: clearOverviewDraft,
    draftSavedAt: overviewDraftSavedAt,
    isHydrated: overviewDraftHydrated,
  } = useFormDraft<Record<string, string>>(`party-${initialParty.id}-overview-draft`);
  const overviewInitial = useMemo(
    () => buildOverviewInitial(party),
    [party]
  );
  const overviewForm = useControlledForm({
    initial: overviewInitial,
    draft: overviewDraft,
    draftHydrated: overviewDraftHydrated,
  });
  const { unsavedChangesDialog } = useUnsavedChangesGuard({ isDirty });

  if (initialParty !== syncedInitialParty) {
    setSyncedInitialParty(initialParty);
    setParty(initialParty);
  }

  function refreshAfter(
    result:
      | { success: true; data: PartyDetailView }
      | { success: false; error?: { message: string } },
    target: "overview" | "header",
    successMessage: string
  ) {
    const setResult =
      target === "overview" ? setOverviewResult : setHeaderResult;

    if (!result.success) {
      setResult(
        platformError(
          "Action failed",
          result.error?.message ?? "Action failed."
        )
      );
      return;
    }
    setResult(platformSuccess("Saved successfully.", successMessage));
    setIsDirty(false);
    setParty(result.data);
    overviewForm.reset(buildOverviewInitial(result.data));
    clearOverviewDraft();
  }

  function onSaveOverview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOverviewResult(null);
    setActiveAction("overview");
    void run(async () => {
      const result = await updatePartyAction(party.id, {
        displayName: overviewForm.textValue("displayName"),
        notes: overviewForm.textValue("notes"),
        dateOfBirth: overviewForm.textValue("dateOfBirth"),
        gender: overviewForm.textValue("gender"),
        preferredLanguageCode: overviewForm.textValue("preferredLanguageCode"),
        registrationNumber: overviewForm.textValue("registrationNumber"),
        taxNumber: overviewForm.textValue("taxNumber"),
        industryCode: overviewForm.textValue("industryCode"),
        organizationTypeCode: overviewForm.textValue("organizationTypeCode"),
        website: overviewForm.textValue("website"),
      });
      refreshAfter(result, "overview", "Party overview was updated.");
    }).finally(() => setActiveAction(null));
  }

  function onSaveOverviewDraft() {
    saveOverviewDraft(overviewForm.values as Record<string, string>);
    setIsDirty(false);
  }

  function runLifecycle(
    action: typeof activatePartyAction,
    successMessage: string
  ) {
    setHeaderResult(null);
    setActiveAction("header");
    void run(async () => {
      const result = await action(party.id);
      refreshAfter(result, "header", successMessage);
    }).finally(() => setActiveAction(null));
  }

  const completionItems = useMemo(
    () =>
      buildPartyCompletionItems({
        party,
        contacts,
        addresses,
        documents,
        relationships,
        groups,
        organizationStructure,
        roles,
      }),
    [party, contacts, addresses, documents, relationships, groups, organizationStructure, roles]
  );

  const quickActions = useMemo(
    () => buildPartyQuickActions(party.id, party.partyTypeCode),
    [party.id, party.partyTypeCode]
  );

  const recommendations = useMemo(
    () =>
      buildPartyRecommendations({
        party,
        contacts,
        addresses,
        documents,
        organizationStructure,
      }),
    [party, contacts, addresses, documents, organizationStructure]
  );

  const recentActivity = useMemo(
    () => toRecentActivityItems(timeline.events),
    [timeline.events]
  );

  const activeTabLabel =
    PARTY_WORKSPACE_TABS.find((tab) => tab.id === activeTab)?.label ??
    "Overview";

  const breadcrumbs = useMemo(
    () => [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Parties", href: "/parties" },
      { label: party.displayName, href: `/parties/${party.id}` },
      { label: activeTabLabel },
    ],
    [party.displayName, party.id, activeTabLabel]
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <SetBreadcrumbs items={breadcrumbs} />
      <PlatformWorkspaceHeader
        backHref="/parties"
        backLabel="Back to Party Dashboard"
        workspaceLabel="Party Workspace"
        title={party.displayName}
        subtitle={`${party.partyNumber} · ${party.partyTypeName}`}
        statusLabel={party.statusName}
        createdLabel={formatDate(party.registrationDate)}
        completionItems={completionItems}
        quickActions={quickActions}
        headerResult={headerResult}
        isProcessing={isProcessing && activeAction === "header"}
        processingLabel={PROCESSING_LABELS.saving}
        onDismissHeaderResult={() => setHeaderResult(null)}
        favoriteControl={
          <PlatformFavoriteButton
            entityType="party"
            entityId={party.id}
            label={party.displayName}
            href={`/parties/${party.id}`}
          />
        }
        primaryActions={
          <>
            {party.statusCode !== PARTY_STATUS_CODES.ACTIVE ? (
              <PlatformProcessingButton
                type="button"
                variant="outline"
                disabled={party.statusCode === PARTY_STATUS_CODES.ARCHIVED}
                isProcessing={isProcessing}
                processingLabel={PROCESSING_LABELS.saving}
                idleLabel="Activate"
                onClick={() =>
                  runLifecycle(activatePartyAction, "Party activated.")
                }
              />
            ) : null}
            {party.statusCode === PARTY_STATUS_CODES.ACTIVE ? (
              <PlatformProcessingButton
                type="button"
                variant="outline"
                isProcessing={isProcessing}
                processingLabel={PROCESSING_LABELS.saving}
                idleLabel="Suspend"
                onClick={() =>
                  runLifecycle(suspendPartyAction, "Party suspended.")
                }
              />
            ) : null}
            {party.statusCode !== PARTY_STATUS_CODES.ARCHIVED ? (
              <PlatformProcessingButton
                type="button"
                variant="outline"
                isProcessing={isProcessing}
                processingLabel={PROCESSING_LABELS.saving}
                idleLabel="Archive"
                onClick={() =>
                  runLifecycle(archivePartyAction, "Party archived.")
                }
              />
            ) : null}
          </>
        }
      />

      <PlatformTabs
        tabs={PARTY_WORKSPACE_TABS.map((tab) => ({
          id: tab.id,
          label: tab.label,
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        ariaLabel="Party workspace tabs"
      />

      {activeTab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Overview</CardTitle>
              <CardDescription>
                Core Party details. Party type cannot be changed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                ref={overviewFormRef}
                onSubmit={onSaveOverview}
                className="space-y-4"
                onChange={() => setIsDirty(true)}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <ReadOnlyField label="Party ID" value={party.partyNumber} />
                  <ReadOnlyField label="Party Type" value={party.partyTypeName} />
                  <ReadOnlyField label="Status" value={party.statusName} />
                  <ReadOnlyField
                    label="Registration Date"
                    value={formatDate(party.registrationDate)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    value={overviewForm.textValue("displayName")}
                    onChange={(event) =>
                      overviewForm.setField("displayName", event.target.value)
                    }
                    required
                    maxLength={300}
                    disabled={party.statusCode === PARTY_STATUS_CODES.ARCHIVED}
                  />
                </div>

                {party.partyTypeCode === PARTY_TYPE_CODES.INDIVIDUAL &&
                party.individual ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        name="dateOfBirth"
                        type="date"
                        value={overviewForm.textValue("dateOfBirth")}
                        onChange={(event) =>
                          overviewForm.setField("dateOfBirth", event.target.value)
                        }
                        disabled={
                          party.statusCode === PARTY_STATUS_CODES.ARCHIVED
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <select
                        id="gender"
                        name="gender"
                        value={overviewForm.textValue("gender")}
                        onChange={(event) =>
                          overviewForm.setField("gender", event.target.value)
                        }
                        disabled={
                          party.statusCode === PARTY_STATUS_CODES.ARCHIVED
                        }
                        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      >
                        <option value="">Select gender</option>
                        {catalogues.genders.map((option) => (
                          <option key={option.code} value={option.code}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preferredLanguageCode">
                        Preferred Language
                      </Label>
                      <select
                        id="preferredLanguageCode"
                        name="preferredLanguageCode"
                        value={overviewForm.textValue("preferredLanguageCode")}
                        onChange={(event) =>
                          overviewForm.setField(
                            "preferredLanguageCode",
                            event.target.value
                          )
                        }
                        disabled={
                          party.statusCode === PARTY_STATUS_CODES.ARCHIVED
                        }
                        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      >
                        <option value="">Select language</option>
                        {catalogues.languages.map((option) => (
                          <option key={option.code} value={option.code}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : null}

                {party.partyTypeCode === PARTY_TYPE_CODES.ORGANIZATION &&
                party.organization ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="registrationNumber">
                        Registration Number
                      </Label>
                      <Input
                        id="registrationNumber"
                        name="registrationNumber"
                        value={overviewForm.textValue("registrationNumber")}
                        onChange={(event) =>
                          overviewForm.setField(
                            "registrationNumber",
                            event.target.value
                          )
                        }
                        disabled={
                          party.statusCode === PARTY_STATUS_CODES.ARCHIVED
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxNumber">Tax Number</Label>
                      <Input
                        id="taxNumber"
                        name="taxNumber"
                        value={overviewForm.textValue("taxNumber")}
                        onChange={(event) =>
                          overviewForm.setField("taxNumber", event.target.value)
                        }
                        disabled={
                          party.statusCode === PARTY_STATUS_CODES.ARCHIVED
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industryCode">Industry</Label>
                      <select
                        id="industryCode"
                        name="industryCode"
                        value={overviewForm.textValue("industryCode")}
                        onChange={(event) =>
                          overviewForm.setField("industryCode", event.target.value)
                        }
                        disabled={
                          party.statusCode === PARTY_STATUS_CODES.ARCHIVED
                        }
                        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      >
                        {catalogues.industries.map((option) => (
                          <option key={option.code} value={option.code}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="organizationTypeCode">
                        Organization Type
                      </Label>
                      <select
                        id="organizationTypeCode"
                        name="organizationTypeCode"
                        value={overviewForm.textValue("organizationTypeCode")}
                        onChange={(event) =>
                          overviewForm.setField(
                            "organizationTypeCode",
                            event.target.value
                          )
                        }
                        disabled={
                          party.statusCode === PARTY_STATUS_CODES.ARCHIVED
                        }
                        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      >
                        {catalogues.organizationTypes.map((option) => (
                          <option key={option.code} value={option.code}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        name="website"
                        value={overviewForm.textValue("website")}
                        onChange={(event) =>
                          overviewForm.setField("website", event.target.value)
                        }
                        disabled={
                          party.statusCode === PARTY_STATUS_CODES.ARCHIVED
                        }
                      />
                    </div>
                  </>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    value={overviewForm.textValue("notes")}
                    onChange={(event) =>
                      overviewForm.setField("notes", event.target.value)
                    }
                    disabled={party.statusCode === PARTY_STATUS_CODES.ARCHIVED}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                {party.statusCode !== PARTY_STATUS_CODES.ARCHIVED ? (
                  <PlatformFormActionFooter
                    result={overviewResult}
                    isProcessing={isProcessing && activeAction === "overview"}
                    processingLabel={PROCESSING_LABELS.savingOverview}
                    draftSavedAt={overviewDraftSavedAt}
                    onDismiss={() => setOverviewResult(null)}
                  >
                    <PlatformProcessingButton
                      type="submit"
                      isProcessing={isProcessing}
                      processingLabel={PROCESSING_LABELS.savingOverview}
                      idleLabel="Save Overview"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isProcessing}
                      onClick={onSaveOverviewDraft}
                    >
                      Save Draft
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isProcessing}
                      onClick={() => setIsDirty(false)}
                    >
                      Cancel
                    </Button>
                  </PlatformFormActionFooter>
                ) : null}
              </form>
            </CardContent>
          </Card>

          <div className="platform-workspace-guidance-column space-y-4">
            <PlatformRecentActivityCard events={recentActivity} />
            <PlatformRecommendationsCard recommendations={recommendations} />
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
              <SummaryRow label="Display Name" value={party.displayName} />
              <SummaryRow label="Type" value={party.partyTypeName} />
              <SummaryRow label="Status" value={party.statusName} />
              {party.partyTypeCode === PARTY_TYPE_CODES.ORGANIZATION ? (
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => {
                      setActiveTab("organization-structure");
                      setShowAddUnit(true);
                    }}
                  >
                    <NetworkIcon className="size-4" aria-hidden />
                    Add Organizational Unit
                  </Button>
                </div>
              ) : null}
              {party.individual ? (
                <>
                  <SummaryRow
                    label="Date of Birth"
                    value={formatDate(party.individual.dateOfBirth)}
                  />
                  <SummaryRow
                    label="Gender"
                    value={
                      catalogues.genders.find(
                        (g) => g.code === party.individual?.gender
                      )?.name ??
                      party.individual.gender ??
                      "—"
                    }
                  />
                  <SummaryRow
                    label="Language"
                    value={
                      catalogues.languages.find(
                        (l) =>
                          l.code === party.individual?.preferredLanguageCode
                      )?.name ??
                      party.individual.preferredLanguageCode ??
                      "—"
                    }
                  />
                </>
              ) : null}
              {party.organization ? (
                <>
                  <SummaryRow
                    label="Industry"
                    value={party.organization.industryName ?? "—"}
                  />
                  <SummaryRow
                    label="Org Type"
                    value={party.organization.organizationTypeName ?? "—"}
                  />
                  <SummaryRow
                    label="Website"
                    value={party.organization.website ?? "—"}
                  />
                </>
              ) : null}
            </CardContent>
          </Card>
          </div>
        </div>
      ) : activeTab === "roles" ? (
        <PartyRolesPanel partyId={party.id} initialData={roles} />
      ) : activeTab === "contacts" ? (
        <PartyContactsPanel partyId={party.id} initialData={contacts} />
      ) : activeTab === "addresses" ? (
        <PartyAddressesPanel partyId={party.id} initialData={addresses} />
      ) : activeTab === "organization-structure" ? (
        <PartyOrganizationStructurePanel
          partyId={party.id}
          organizationName={party.displayName}
          initialData={organizationStructure}
          showAddForm={showAddUnit}
        />
      ) : activeTab === "relationships" ? (
        <PartyRelationshipsPanel
          partyId={party.id}
          initialData={relationships}
        />
      ) : activeTab === "documents" ? (
        <PartyDocumentsPanel partyId={party.id} initialData={documents} />
      ) : activeTab === "groups" ? (
        <PartyGroupsPanel partyId={party.id} initialData={groups} />
      ) : activeTab === "timeline" ? (
        <PartyTimelinePanel partyId={party.id} initialData={timeline} />
      ) : activeTab === "communication-preferences" ? (
        <PartyCommunicationPreferencesPanel
          partyId={party.id}
          initialData={communicationPreferences}
        />
      ) : activeTab === "audit-history" ? (
        <PartyAuditHistoryPanel partyId={party.id} initialData={auditHistory} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {PARTY_WORKSPACE_TABS.find((tab) => tab.id === activeTab)?.label}
            </CardTitle>
            <CardDescription>{FUTURE_TAB_MESSAGE}</CardDescription>
          </CardHeader>
        </Card>
      )}
      {unsavedChangesDialog}
    </main>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
