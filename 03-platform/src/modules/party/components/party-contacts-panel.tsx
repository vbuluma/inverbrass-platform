/**
 * Purpose:
 * Party Workspace Contacts tab — add, edit, prefer, verify, deactivate, remove.
 *
 * Implementation Package:
 * BP-002 / IP-003 – Contacts & Communication
 */

"use client";

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
  addPartyContactAction,
  deactivatePartyContactAction,
  reactivatePartyContactAction,
  removePartyContactAction,
  setPreferredPartyContactAction,
  updatePartyContactAction,
  verifyPartyContactAction,
} from "@/modules/party/actions/party-contact-actions";
import { PARTY_CONTACT_STATUS_CODES } from "@/modules/party/constants";
import type {
  PartyContactView,
  PartyContactsPanelView,
} from "@/modules/party/types";

type PartyContactsPanelProps = {
  partyId: string;
  initialData: PartyContactsPanelView;
};

export function PartyContactsPanel({
  partyId,
  initialData,
}: PartyContactsPanelProps) {
  const [panel, setPanel] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const [contactTypeCode, setContactTypeCode] = useState(
    initialData.availableContactTypes[0]?.code ?? ""
  );
  const [contactValue, setContactValue] = useState("");
  const [isPreferred, setIsPreferred] = useState(false);
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setPanel(initialData);
    setContactTypeCode(initialData.availableContactTypes[0]?.code ?? "");
  }

  function applyResult(
    result:
      | { success: true; data: PartyContactsPanelView }
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
    setContactTypeCode(result.data.availableContactTypes[0]?.code ?? "");
    setContactValue("");
    setIsPreferred(false);
    setNotes("");
    setEditingId(null);
  }

  function onAdd() {
    if (!contactTypeCode) {
      setError("Select a contact type.");
      return;
    }
    if (!contactValue.trim()) {
      setError("Enter a contact value.");
      return;
    }
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await addPartyContactAction(partyId, {
        contactTypeCode,
        contactValue,
        isPreferred,
        notes,
      });
      applyResult(result, "Contact added.");
    });
  }

  function startEdit(contact: PartyContactView) {
    setEditingId(contact.id);
    setEditValue(contact.contactValue);
    setEditNotes(contact.notes ?? "");
    setError(null);
    setMessage(null);
  }

  function onSaveEdit(partyContactId: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updatePartyContactAction(partyId, partyContactId, {
        contactValue: editValue,
        notes: editNotes,
      });
      applyResult(result, "Contact updated.");
    });
  }

  function onSetPreferred(partyContactId: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await setPreferredPartyContactAction(
        partyId,
        partyContactId
      );
      applyResult(result, "Preferred contact updated.");
    });
  }

  function onVerify(partyContactId: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await verifyPartyContactAction(partyId, partyContactId);
      applyResult(result, "Contact marked verified.");
    });
  }

  function onDeactivate(partyContactId: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await deactivatePartyContactAction(
        partyId,
        partyContactId
      );
      applyResult(result, "Contact deactivated.");
    });
  }

  function onReactivate(partyContactId: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await reactivatePartyContactAction(
        partyId,
        partyContactId
      );
      applyResult(result, "Contact reactivated.");
    });
  }

  function onRemove(partyContactId: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await removePartyContactAction(partyId, partyContactId);
      applyResult(result, "Contact removed.");
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
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
            <CardTitle className="text-base">Contacts</CardTitle>
            <CardDescription>
              Multiple contacts are allowed. Only one preferred contact per
              type.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {panel.contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No contacts yet. Add a contact to begin.
              </p>
            ) : (
              <ul className="space-y-3">
                {panel.contacts.map((contact) => (
                  <li
                    key={contact.id}
                    className="space-y-2 rounded-lg border px-3 py-3"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {contact.contactTypeName}
                          {contact.isPreferred ? (
                            <span className="ml-2 text-xs font-normal text-emerald-800">
                              Preferred
                            </span>
                          ) : null}
                        </p>
                        {editingId === contact.id ? (
                          <div className="space-y-2 pt-1">
                            <Input
                              value={editValue}
                              onChange={(event) =>
                                setEditValue(event.target.value)
                              }
                              maxLength={500}
                            />
                            <Input
                              value={editNotes}
                              onChange={(event) =>
                                setEditNotes(event.target.value)
                              }
                              placeholder="Notes (optional)"
                              maxLength={2000}
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                disabled={isPending}
                                onClick={() => onSaveEdit(contact.id)}
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
                          <p className="text-sm">{contact.contactValue}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Verified: {contact.isVerified ? "Yes" : "No"} · Status:{" "}
                          {contact.statusCode}
                        </p>
                      </div>
                    </div>
                    {editingId === contact.id ? null : (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => startEdit(contact)}
                        >
                          Edit
                        </Button>
                        {!contact.isPreferred &&
                        contact.statusCode ===
                          PARTY_CONTACT_STATUS_CODES.ACTIVE ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => onSetPreferred(contact.id)}
                          >
                            Set Preferred
                          </Button>
                        ) : null}
                        {!contact.isVerified ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => onVerify(contact.id)}
                          >
                            Verify
                          </Button>
                        ) : null}
                        {contact.statusCode ===
                        PARTY_CONTACT_STATUS_CODES.ACTIVE ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isPending || contact.isPreferred}
                            onClick={() => onDeactivate(contact.id)}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => onReactivate(contact.id)}
                          >
                            Reactivate
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => onRemove(contact.id)}
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
          <CardTitle className="text-base">Add Contact</CardTitle>
          <CardDescription>
            Additional channels are maintained here after registration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contactTypeCode">Contact Type</Label>
            <select
              id="contactTypeCode"
              value={contactTypeCode}
              onChange={(event) => setContactTypeCode(event.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Select type</option>
              {panel.availableContactTypes.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactValue">Value</Label>
            <Input
              id="contactValue"
              value={contactValue}
              onChange={(event) => setContactValue(event.target.value)}
              maxLength={500}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPreferred}
              onChange={(event) => setIsPreferred(event.target.checked)}
            />
            Mark as preferred for this type
          </label>
          <div className="space-y-2">
            <Label htmlFor="contactNotes">Notes (optional)</Label>
            <Input
              id="contactNotes"
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
            {isPending ? "Saving…" : "Add Contact"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
