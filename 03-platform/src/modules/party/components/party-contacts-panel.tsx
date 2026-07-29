/**
 * Purpose:
 * Party Workspace Contacts tab — add, edit, prefer, verify, deactivate, remove.
 *
 * Implementation Package:
 * BP-002 / IP-003 – Contacts & Communication
 */

"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import {
  PlatformEmptyState,
  PlatformProcessingButton,
  PROCESSING_LABELS,
  contactCreatedNextActions,
  useFormDraft,
  usePanelFeedback,
} from "@/components/platform";
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
  const {
    isPending,
    runPanelAction,
    setValidationError,
    requestConfirm,
    FormFeedback,
    ConfirmDialogHost,
  } = usePanelFeedback<PartyContactsPanelView>();
  const {
    draftValues,
    saveDraft,
    clearDraft,
    draftSavedAt,
  } = useFormDraft<{
    contactTypeCode: string;
    contactValue: string;
    isPreferred: boolean;
    notes: string;
  }>(`party-${partyId}-contacts-create-draft`);
  const [contactTypeCode, setContactTypeCode] = useState(
    () =>
      draftValues?.contactTypeCode ??
      initialData.availableContactTypes[0]?.code ??
      ""
  );
  const [contactValue, setContactValue] = useState(
    () => draftValues?.contactValue ?? ""
  );
  const [isPreferred, setIsPreferred] = useState(
    () => Boolean(draftValues?.isPreferred)
  );
  const [notes, setNotes] = useState(() => draftValues?.notes ?? "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editNotes, setEditNotes] = useState("");

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setPanel(initialData);
    setContactTypeCode(initialData.availableContactTypes[0]?.code ?? "");
  }

  function applySuccess(data: PartyContactsPanelView) {
    setPanel(data);
    setContactTypeCode(data.availableContactTypes[0]?.code ?? "");
    setContactValue("");
    setIsPreferred(false);
    setNotes("");
    setEditingId(null);
  }

  function onAdd() {
    if (!contactTypeCode) {
      setValidationError("Select a contact type.");
      return;
    }
    if (!contactValue.trim()) {
      setValidationError("Enter a contact value.");
      return;
    }
    runPanelAction(
      () =>
        addPartyContactAction(partyId, {
          contactTypeCode,
          contactValue,
          isPreferred,
          notes,
        }),
      {
        successTitle: "Contact created successfully.",
        successMessage: "The contact is now available on this party.",
        nextActions: contactCreatedNextActions(partyId),
        onSuccess: (data) => {
          applySuccess(data);
          clearDraft();
        },
      }
    );
  }

  function startEdit(contact: PartyContactView) {
    setEditingId(contact.id);
    setEditValue(contact.contactValue);
    setEditNotes(contact.notes ?? "");
  }

  function onSaveEdit(partyContactId: string) {
    runPanelAction(
      () =>
        updatePartyContactAction(partyId, partyContactId, {
          contactValue: editValue,
          notes: editNotes,
        }),
      {
        successTitle: "Contact saved.",
        successMessage: "Contact details were updated.",
        onSuccess: applySuccess,
      }
    );
  }

  function onSetPreferred(partyContactId: string) {
    runPanelAction(
      () => setPreferredPartyContactAction(partyId, partyContactId),
      {
        successTitle: "Preferred contact updated.",
        successMessage: "The preferred contact for this type was changed.",
        onSuccess: applySuccess,
      }
    );
  }

  function onVerify(partyContactId: string) {
    runPanelAction(
      () => verifyPartyContactAction(partyId, partyContactId),
      {
        successTitle: "Contact verified.",
        successMessage: "This contact is now marked as verified.",
        onSuccess: applySuccess,
      }
    );
  }

  function onDeactivate(partyContactId: string) {
    requestConfirm({
      title: "Deactivate Contact?",
      description:
        "This contact will remain in history but cannot be used for communication.",
      confirmLabel: "Deactivate",
      onConfirm: () => {
        runPanelAction(
          () => deactivatePartyContactAction(partyId, partyContactId),
          {
            successTitle: "Contact deactivated.",
            successMessage: "The contact is no longer active.",
            onSuccess: applySuccess,
          }
        );
      },
    });
  }

  function onReactivate(partyContactId: string) {
    runPanelAction(
      () => reactivatePartyContactAction(partyId, partyContactId),
      {
        successTitle: "Contact reactivated.",
        successMessage: "The contact is active again.",
        onSuccess: applySuccess,
      }
    );
  }

  function onRemove(partyContactId: string) {
    requestConfirm({
      title: "Remove Contact?",
      description:
        "This contact will be removed from the active list. Historical records may remain in audit history.",
      confirmLabel: "Remove",
      onConfirm: () => {
        runPanelAction(
          () => removePartyContactAction(partyId, partyContactId),
          {
            successTitle: "Contact removed.",
            successMessage: "The contact was removed from this party.",
            onSuccess: applySuccess,
          }
        );
      },
    });
  }

  function onSaveDraft() {
    saveDraft({
      contactTypeCode,
      contactValue,
      isPreferred,
      notes,
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">

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
              <PlatformEmptyState
                title="No Contacts Yet"
                description="Create your first contact to start communicating with this party."
                actionLabel="Create Contact"
                onAction={() =>
                  document.getElementById("contactValue")?.focus()
                }
                compact
              />
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
                          variant="destructive"
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
          <CardTitle className="text-base">Create Contact</CardTitle>
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
          <PlatformProcessingButton
            type="button"
            className="w-full"
            isProcessing={isPending}
            processingLabel={PROCESSING_LABELS.creatingContact}
            idleLabel="Create Contact"
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
            processingLabel={PROCESSING_LABELS.creatingContact}
            draftSavedAt={draftSavedAt}
          />
        </CardContent>
      </Card>
      <ConfirmDialogHost />
    </div>
  );
}
