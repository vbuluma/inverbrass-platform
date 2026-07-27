/**
 * Purpose:
 * Party Workspace Relationships tab — search, add, edit, deactivate, remove.
 *
 * Implementation Package:
 * BP-002 / IP-005 – Party Relationships
 */

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
  const router = useRouter();
  const [panel, setPanel] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const [syncedPartyId, setSyncedPartyId] = useState(partyId);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PartySearchResultView[]>(
    []
  );
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [relationshipTypeCode, setRelationshipTypeCode] = useState(
    initialData.availableRelationshipTypes[0]?.code ?? ""
  );
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (partyId !== syncedPartyId) {
    setSyncedPartyId(partyId);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedPartyId("");
    setStartDate("");
    setNotes("");
    setEditingId(null);
    setError(null);
    setMessage(null);
  }

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setPanel(initialData);
    setRelationshipTypeCode(
      initialData.availableRelationshipTypes[0]?.code ?? ""
    );
  }

  function applyPanelResult(
    result:
      | { success: true; data: PartyRelationshipsPanelView }
      | { success: false; error: { message: string } },
    successMessage: string
  ) {
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setError(null);
    setMessage(successMessage);
    setPanel(result.data);
    setRelationshipTypeCode(
      result.data.availableRelationshipTypes[0]?.code ?? ""
    );
    setSearchQuery("");
    setSearchResults([]);
    setSelectedPartyId("");
    setStartDate("");
    setNotes("");
    setEditingId(null);
    router.refresh();
  }

  function onSearch() {
    if (searchQuery.trim().length < 2) {
      setError("Enter at least 2 characters to search.");
      return;
    }
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await searchPartiesForRelationshipAction(
        partyId,
        searchQuery
      );
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      const filtered = result.data.filter((row) => row.id !== partyId);
      setSearchResults(filtered);
      setSelectedPartyId(filtered[0]?.id ?? "");
    });
  }

  function onAdd() {
    if (!selectedPartyId) {
      setError("Search and select a related party.");
      return;
    }
    if (selectedPartyId === partyId) {
      setError("A party cannot have a relationship with itself.");
      return;
    }
    if (!relationshipTypeCode) {
      setError("Select a relationship type.");
      return;
    }
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await addPartyRelationshipAction(partyId, {
        toPartyId: selectedPartyId,
        relationshipTypeCode,
        startDate: startDate || undefined,
        notes,
      });
      applyPanelResult(result, "Relationship added.");
    });
  }

  function startEdit(relationship: PartyRelationshipView) {
    setEditingId(relationship.id);
    setEditStartDate(relationship.startDate);
    setEditEndDate(relationship.endDate ?? "");
    setEditNotes(relationship.notes ?? "");
    setError(null);
    setMessage(null);
  }

  function onSaveEdit(partyRelationshipId: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updatePartyRelationshipAction(
        partyId,
        partyRelationshipId,
        {
          startDate: editStartDate,
          endDate: editEndDate,
          notes: editNotes,
        }
      );
      applyPanelResult(result, "Relationship updated.");
    });
  }

  function onDeactivate(partyRelationshipId: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await deactivatePartyRelationshipAction(
        partyId,
        partyRelationshipId
      );
      applyPanelResult(result, "Relationship deactivated.");
    });
  }

  function onReactivate(partyRelationshipId: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await reactivatePartyRelationshipAction(
        partyId,
        partyRelationshipId
      );
      applyPanelResult(result, "Relationship reactivated.");
    });
  }

  function onRemove(partyRelationshipId: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await removePartyRelationshipAction(
        partyId,
        partyRelationshipId
      );
      applyPanelResult(result, "Relationship removed.");
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {message ? (
          <Alert>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Relationships</CardTitle>
            <CardDescription>
              Links between this party and other existing parties.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {panel.relationships.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No relationships yet. Search for a party to link.
              </p>
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
                          variant="outline"
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
          <CardTitle className="text-base">Add Relationship</CardTitle>
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
          <Button
            type="button"
            className="w-full"
            disabled={isPending}
            onClick={onAdd}
          >
            {isPending ? "Saving…" : "Add Relationship"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
