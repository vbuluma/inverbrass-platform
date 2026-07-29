/**
 * Purpose:
 * Party Workspace Relationships tab — search, add, edit, deactivate, remove.
 *
 * Implementation Package:
 * BP-002 / IP-005 – Party Relationships
 */

"use client";

import { useState } from "react";

import {
  PlatformEmptyState,
  PlatformSearchState,
  type PlatformSearchStateStatus,
  PlatformProcessingButton,
  PROCESSING_LABELS,
  relationshipCreatedNextActions,
  useFormDraft,
  usePanelFeedback,
} from "@/components/platform";
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
import {
  addPartyRelationshipAction,
  deactivatePartyRelationshipAction,
  reactivatePartyRelationshipAction,
  removePartyRelationshipAction,
  searchPartiesForRelationshipAction,
  updatePartyRelationshipAction,
} from "@/modules/party/actions/party-relationship-actions";
import { PARTY_RELATIONSHIP_STATUS_CODES } from "@/modules/party/constants";
import type {
  PartyRelationshipsPanelView,
  PartyRelationshipView,
  PartySearchResultView,
} from "@/modules/party/types";

type PartyRelationshipsPanelProps = {
  partyId: string;
  initialData: PartyRelationshipsPanelView;
};

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(value)
    );
  } catch {
    return value;
  }
}

export function PartyRelationshipsPanel({
  partyId,
  initialData,
}: PartyRelationshipsPanelProps) {
  const [panel, setPanel] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const [syncedPartyId, setSyncedPartyId] = useState(partyId);
  const [searchResults, setSearchResults] = useState<PartySearchResultView[]>(
    []
  );
  const [searchStatus, setSearchStatus] =
    useState<PlatformSearchStateStatus>("idle");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const {
    isPending,
    runPanelAction,
    clearResult,
    setValidationError,
    requestConfirm,
    FormFeedback,
    ConfirmDialogHost,
  } = usePanelFeedback<PartyRelationshipsPanelView>();
  const {
    draftValues,
    saveDraft,
    clearDraft,
    draftSavedAt,
  } = useFormDraft<{
    searchQuery: string;
    selectedPartyId: string;
    relationshipTypeCode: string;
    startDate: string;
    notes: string;
  }>(`party-${partyId}-relationships-create-draft`);
  const [searchQuery, setSearchQuery] = useState(
    () => draftValues?.searchQuery ?? ""
  );
  const [selectedPartyId, setSelectedPartyId] = useState(
    () => draftValues?.selectedPartyId ?? ""
  );
  const [relationshipTypeCode, setRelationshipTypeCode] = useState(
    () =>
      draftValues?.relationshipTypeCode ??
      initialData.availableRelationshipTypes[0]?.code ??
      ""
  );
  const [startDate, setStartDate] = useState(
    () => draftValues?.startDate ?? ""
  );
  const [notes, setNotes] = useState(() => draftValues?.notes ?? "");

  if (partyId !== syncedPartyId) {
    setSyncedPartyId(partyId);
    setSearchQuery("");
    setSearchResults([]);
    setSearchStatus("idle");
    setSearchError(null);
    setSelectedPartyId("");
    setStartDate("");
    setNotes("");
    setEditingId(null);
  }

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setPanel(initialData);
    setRelationshipTypeCode(
      initialData.availableRelationshipTypes[0]?.code ?? ""
    );
  }

  function applySuccess(data: PartyRelationshipsPanelView) {
    setPanel(data);
    setRelationshipTypeCode(data.availableRelationshipTypes[0]?.code ?? "");
    setSearchQuery("");
    setSearchResults([]);
    setSearchStatus("idle");
    setSearchError(null);
    setSelectedPartyId("");
    setStartDate("");
    setNotes("");
    setEditingId(null);
  }

  function onSearch() {
    if (searchQuery.trim().length < 2) {
      setValidationError("Enter at least 2 characters to search.");
      return;
    }
    setSearchStatus("searching");
    setSearchError(null);
    setSearchResults([]);
    runPanelAction(
      async () => {
        try {
          const result = await searchPartiesForRelationshipAction(
            partyId,
            searchQuery
          );
          if (!result.success) {
            setSearchStatus("error");
            setSearchError(result.error.message);
            return result;
          }
          const filtered = result.data.filter((row) => row.id !== partyId);
          setSearchResults(filtered);
          setSelectedPartyId(filtered[0]?.id ?? "");
          setSearchStatus(filtered.length > 0 ? "success" : "empty");
          return { success: true, data: panel };
        } catch {
          setSearchStatus("error");
          setSearchError("Unable to complete search.");
          return {
            success: false,
            error: { code: "SEARCH_FAILED", message: "Unable to complete search." },
          };
        }
      },
      {
        successTitle: "Search complete.",
        successMessage: "Select a party from the results to create a relationship.",
        onSuccess: () => clearResult(),
      }
    );
  }

  function onAdd() {
    if (!selectedPartyId) {
      setValidationError("Search and select a related party.");
      return;
    }
    if (selectedPartyId === partyId) {
      setValidationError("A party cannot have a relationship with itself.");
      return;
    }
    if (!relationshipTypeCode) {
      setValidationError("Select a relationship type.");
      return;
    }
    runPanelAction(
      () =>
        addPartyRelationshipAction(partyId, {
          toPartyId: selectedPartyId,
          relationshipTypeCode,
          startDate: startDate || undefined,
          notes,
        }),
      {
        successTitle: "Relationship created successfully.",
        successMessage: "The relationship is now linked to this party.",
        nextActions: relationshipCreatedNextActions(partyId),
        onSuccess: (data) => {
          applySuccess(data);
          clearDraft();
        },
      }
    );
  }

  function onSaveDraft() {
    saveDraft({
      searchQuery,
      selectedPartyId,
      relationshipTypeCode,
      startDate,
      notes,
    });
  }

  function startEdit(relationship: PartyRelationshipView) {
    setEditingId(relationship.id);
    setEditStartDate(relationship.startDate);
    setEditEndDate(relationship.endDate ?? "");
    setEditNotes(relationship.notes ?? "");
  }

  function onSaveEdit(partyRelationshipId: string) {
    runPanelAction(
      () =>
        updatePartyRelationshipAction(partyId, partyRelationshipId, {
          startDate: editStartDate,
          endDate: editEndDate,
          notes: editNotes,
        }),
      {
        successTitle: "Relationship saved.",
        successMessage: "Relationship details were updated.",
        onSuccess: applySuccess,
      }
    );
  }

  function onDeactivate(partyRelationshipId: string) {
    requestConfirm({
      title: "Deactivate Relationship?",
      description:
        "This relationship will remain in history but will no longer be active.",
      confirmLabel: "Deactivate",
      onConfirm: () => {
        runPanelAction(
          () => deactivatePartyRelationshipAction(partyId, partyRelationshipId),
          {
            successTitle: "Relationship deactivated.",
            successMessage: "The relationship is no longer active.",
            onSuccess: applySuccess,
          }
        );
      },
    });
  }

  function onReactivate(partyRelationshipId: string) {
    runPanelAction(
      () => reactivatePartyRelationshipAction(partyId, partyRelationshipId),
      {
        successTitle: "Relationship reactivated.",
        successMessage: "The relationship is active again.",
        onSuccess: applySuccess,
      }
    );
  }

  function onRemove(partyRelationshipId: string) {
    requestConfirm({
      title: "Remove Relationship?",
      description:
        "This relationship will be removed from the active list. Historical records may remain in audit history.",
      confirmLabel: "Remove",
      onConfirm: () => {
        runPanelAction(
          () => removePartyRelationshipAction(partyId, partyRelationshipId),
          {
            successTitle: "Relationship removed.",
            successMessage: "The relationship was removed from this party.",
            onSuccess: applySuccess,
          }
        );
      },
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Relationships</CardTitle>
            <CardDescription>
              Links between this party and other existing parties.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {panel.relationships.length === 0 ? (
              <PlatformEmptyState
                title="No Relationships Yet"
                description="Search for an existing party to create your first relationship."
                actionLabel="Create Relationship"
                onAction={() =>
                  document.getElementById("partySearch")?.focus()
                }
                compact
              />
            ) : (
              <ul className="space-y-3">
                {panel.relationships.map((relationship) => (
                  <li
                    key={relationship.id}
                    className="space-y-2 rounded-lg border px-3 py-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {relationship.relatedPartyName}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {relationship.relatedPartyNumber}
                        </span>
                      </p>
                      <p className="text-sm">
                        {relationship.relationshipTypeName}
                        {relationship.direction === "INCOMING" ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (incoming)
                          </span>
                        ) : null}
                      </p>
                      {editingId === relationship.id ? (
                        <div className="grid gap-2 pt-1 sm:grid-cols-2">
                          <Input
                            type="date"
                            value={editStartDate}
                            onChange={(event) =>
                              setEditStartDate(event.target.value)
                            }
                          />
                          <Input
                            type="date"
                            value={editEndDate}
                            onChange={(event) =>
                              setEditEndDate(event.target.value)
                            }
                            placeholder="End date"
                          />
                          <Input
                            value={editNotes}
                            onChange={(event) =>
                              setEditNotes(event.target.value)
                            }
                            placeholder="Notes"
                            className="sm:col-span-2"
                          />
                          <div className="flex flex-wrap gap-2 sm:col-span-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={isPending}
                              onClick={() => onSaveEdit(relationship.id)}
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isPending}
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {formatDate(relationship.startDate)} →{" "}
                          {formatDate(relationship.endDate)} · Status:{" "}
                          {relationship.statusCode}
                        </p>
                      )}
                    </div>
                    {editingId === relationship.id ? null : (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => startEdit(relationship)}
                        >
                          Edit
                        </Button>
                        {relationship.statusCode ===
                        PARTY_RELATIONSHIP_STATUS_CODES.ACTIVE ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => onDeactivate(relationship.id)}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => onReactivate(relationship.id)}
                          >
                            Reactivate
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={isPending}
                          onClick={() => onRemove(relationship.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">Create Relationship</CardTitle>
          <CardDescription>
            Search an existing party — relationships never create duplicate
            parties.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="partySearch">Search Party</Label>
            <div className="flex gap-2">
              <Input
                id="partySearch"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Name, Party ID, mobile, email…"
              />
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={onSearch}
              >
                Search
              </Button>
            </div>
          </div>
          <PlatformSearchState
            status={searchStatus}
            onRetry={onSearch}
            errorMessage={searchError ?? undefined}
            emptyHints={[
              "Different keywords",
              "Removing filters",
              "Create a new party first",
            ]}
            compact
          >
            {searchResults.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="selectedParty">Related Party</Label>
                <select
                  id="selectedParty"
                  value={selectedPartyId}
                  onChange={(event) => setSelectedPartyId(event.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  {searchResults.map((result) => (
                    <option key={result.id} value={result.id}>
                      {result.displayName} ({result.partyNumber}) ·{" "}
                      {result.partyTypeName}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </PlatformSearchState>
          <div className="space-y-2">
            <Label htmlFor="relationshipTypeCode">Relationship Type</Label>
            <select
              id="relationshipTypeCode"
              value={relationshipTypeCode}
              onChange={(event) => setRelationshipTypeCode(event.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Select type</option>
              {panel.availableRelationshipTypes.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date (optional)</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="relationshipNotes">Notes (optional)</Label>
            <Input
              id="relationshipNotes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={2000}
            />
          </div>
          <PlatformProcessingButton
            type="button"
            className="w-full"
            isProcessing={isPending}
            processingLabel={PROCESSING_LABELS.creatingRelationship}
            idleLabel="Create Relationship"
            onClick={onAdd}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isPending}
            onClick={onSaveDraft}
          >
            Save Draft
          </Button>
          <FormFeedback
            processingLabel={PROCESSING_LABELS.creatingRelationship}
            draftSavedAt={draftSavedAt}
          />
        </CardContent>
      </Card>
      <ConfirmDialogHost />
    </div>
  );
}
