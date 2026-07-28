/**
 * Purpose:
 * Party Workspace Addresses tab — add, edit, default, deactivate, remove.
 *
 * Implementation Package:
 * BP-002 / IP-004 – Address Management
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
import { getAddressFieldLabels } from "@/core/shared/address";
import {
  addPartyAddressAction,
  deactivatePartyAddressAction,
  reactivatePartyAddressAction,
  removePartyAddressAction,
  setDefaultPartyAddressAction,
  updatePartyAddressAction,
} from "@/modules/party/actions/party-address-actions";
import { PARTY_ADDRESS_STATUS_CODES } from "@/modules/party/constants";
import type {
  PartyAddressesPanelView,
  PartyAddressView,
} from "@/modules/party/types";

type PartyAddressesPanelProps = {
  partyId: string;
  initialData: PartyAddressesPanelView;
};

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

function AddressViewSummary({ address }: { address: PartyAddressView }) {
  return (
    <div className="space-y-1 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Summary
      </p>
      <p>Type: {address.addressTypeName}</p>
      <p>Status: {address.statusCode}</p>
      {address.isDefault ? <p>Default for this type</p> : null}
      <p>Country: {address.countryName}</p>
      {address.addressLine1 ? <p>Line 1: {address.addressLine1}</p> : null}
      {address.addressLine2 ? <p>Line 2: {address.addressLine2}</p> : null}
      {address.cityTown ? <p>City / Town: {address.cityTown}</p> : null}
      {address.countyOrStateDisplay !== "—" ? (
        <p>County / State: {address.countyOrStateDisplay}</p>
      ) : null}
      {address.wardLocality ? <p>Ward / Locality: {address.wardLocality}</p> : null}
      {address.postalCode ? <p>Postal code: {address.postalCode}</p> : null}
      {address.landmark ? <p>Landmark: {address.landmark}</p> : null}
      {address.gpsLatitude && address.gpsLongitude ? (
        <p>
          GPS: {address.gpsLatitude}, {address.gpsLongitude}
        </p>
      ) : null}
      {address.notes ? <p>Notes: {address.notes}</p> : null}
      {address.statusCode === PARTY_ADDRESS_STATUS_CODES.INACTIVE &&
      address.deactivatedAt ? (
        <p>Date deactivated: {formatDate(address.deactivatedAt)}</p>
      ) : null}
    </div>
  );
}

export function PartyAddressesPanel({
  partyId,
  initialData,
}: PartyAddressesPanelProps) {
  const [panel, setPanel] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const [addressTypeCode, setAddressTypeCode] = useState(
    initialData.availableAddressTypes[0]?.code ?? ""
  );
  const [countryCode, setCountryCode] = useState(
    initialData.countries[0]?.code ?? ""
  );
  const [stateProvince, setStateProvince] = useState("");
  const [countyDistrict, setCountyDistrict] = useState("");
  const [cityTown, setCityTown] = useState("");
  const [wardLocality, setWardLocality] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [landmark, setLandmark] = useState("");
  const [gpsLatitude, setGpsLatitude] = useState("");
  const [gpsLongitude, setGpsLongitude] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<PartyAddressView>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setPanel(initialData);
    setAddressTypeCode(initialData.availableAddressTypes[0]?.code ?? "");
    setCountryCode(initialData.countries[0]?.code ?? "");
  }

  const fieldLabels = getAddressFieldLabels(countryCode);

  function applyResult(
    result:
      | { success: true; data: PartyAddressesPanelView }
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
    setAddressTypeCode(result.data.availableAddressTypes[0]?.code ?? "");
    setCountryCode(result.data.countries[0]?.code ?? "");
    resetAddForm();
    setEditingId(null);
    setViewingId(null);
  }

  function resetAddForm() {
    setStateProvince("");
    setCountyDistrict("");
    setCityTown("");
    setWardLocality("");
    setPostalCode("");
    setAddressLine1("");
    setAddressLine2("");
    setLandmark("");
    setGpsLatitude("");
    setGpsLongitude("");
    setIsDefault(false);
    setNotes("");
  }

  function onAdd() {
    if (!addressTypeCode) {
      setError("Select an address type.");
      return;
    }
    if (!countryCode) {
      setError("Select a country.");
      return;
    }
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await addPartyAddressAction(partyId, {
        addressTypeCode,
        countryCode,
        stateProvince,
        countyDistrict,
        cityTown,
        wardLocality,
        postalCode,
        addressLine1,
        addressLine2,
        landmark,
        gpsLatitude: gpsLatitude || null,
        gpsLongitude: gpsLongitude || null,
        isDefault,
        notes,
      });
      applyResult(result, "Address added.");
    });
  }

  function startEdit(address: PartyAddressView) {
    setEditingId(address.id);
    setViewingId(null);
    setEditDraft({ ...address });
    setError(null);
    setMessage(null);
  }

  function onSaveEdit(partyAddressId: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updatePartyAddressAction(partyId, partyAddressId, {
        countryCode: editDraft.countryCode,
        stateProvince: editDraft.stateProvince ?? "",
        countyDistrict: editDraft.countyDistrict ?? "",
        cityTown: editDraft.cityTown ?? "",
        wardLocality: editDraft.wardLocality ?? "",
        postalCode: editDraft.postalCode ?? "",
        addressLine1: editDraft.addressLine1 ?? "",
        addressLine2: editDraft.addressLine2 ?? "",
        landmark: editDraft.landmark ?? "",
        gpsLatitude: editDraft.gpsLatitude ?? null,
        gpsLongitude: editDraft.gpsLongitude ?? null,
        notes: editDraft.notes ?? "",
      });
      applyResult(result, "Address updated.");
    });
  }

  function onSetDefault(partyAddressId: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await setDefaultPartyAddressAction(partyId, partyAddressId);
      applyResult(result, "Default address updated.");
    });
  }

  function onDeactivate(partyAddressId: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await deactivatePartyAddressAction(partyId, partyAddressId);
      applyResult(result, "Address deactivated.");
    });
  }

  function onReactivate(partyAddressId: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await reactivatePartyAddressAction(partyId, partyAddressId);
      applyResult(result, "Address reactivated.");
    });
  }

  function onRemove(partyAddressId: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await removePartyAddressAction(partyId, partyAddressId);
      applyResult(result, "Address removed.");
    });
  }

  const editLabels = getAddressFieldLabels(editDraft.countryCode ?? countryCode);

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
            <CardTitle className="text-base">Addresses</CardTitle>
            <CardDescription>
              Multiple addresses are allowed. One default per address type.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {panel.addresses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No addresses yet. Add an address to begin.
              </p>
            ) : (
              <ul className="space-y-3">
                {panel.addresses.map((address) => (
                  <li
                    key={address.id}
                    className="space-y-2 rounded-lg border px-3 py-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {address.addressTypeName}
                        {address.isDefault ? (
                          <span className="ml-2 text-xs font-normal text-emerald-800">
                            Default
                          </span>
                        ) : null}
                      </p>
                      {editingId === address.id ? (
                        <div className="grid gap-2 pt-1 sm:grid-cols-2">
                          <select
                            value={editDraft.countryCode ?? ""}
                            onChange={(event) =>
                              setEditDraft((draft) => ({
                                ...draft,
                                countryCode: event.target.value,
                              }))
                            }
                            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm sm:col-span-2"
                          >
                            {panel.countries.map((option) => (
                              <option key={option.code} value={option.code}>
                                {option.name}
                              </option>
                            ))}
                          </select>
                          <Input
                            value={editDraft.addressLine1 ?? ""}
                            onChange={(event) =>
                              setEditDraft((draft) => ({
                                ...draft,
                                addressLine1: event.target.value,
                              }))
                            }
                            placeholder="Address line 1"
                            className="sm:col-span-2"
                          />
                          <Input
                            value={editDraft.cityTown ?? ""}
                            onChange={(event) =>
                              setEditDraft((draft) => ({
                                ...draft,
                                cityTown: event.target.value,
                              }))
                            }
                            placeholder={editLabels.cityTown}
                          />
                          <Input
                            value={editDraft.countyDistrict ?? ""}
                            onChange={(event) =>
                              setEditDraft((draft) => ({
                                ...draft,
                                countyDistrict: event.target.value,
                              }))
                            }
                            placeholder={editLabels.countyDistrict}
                          />
                          <Input
                            value={editDraft.stateProvince ?? ""}
                            onChange={(event) =>
                              setEditDraft((draft) => ({
                                ...draft,
                                stateProvince: event.target.value,
                              }))
                            }
                            placeholder={editLabels.stateProvince}
                          />
                          <Input
                            value={editDraft.postalCode ?? ""}
                            onChange={(event) =>
                              setEditDraft((draft) => ({
                                ...draft,
                                postalCode: event.target.value,
                              }))
                            }
                            placeholder="Postal code"
                          />
                          <div className="flex flex-wrap gap-2 sm:col-span-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={isPending}
                              onClick={() => onSaveEdit(address.id)}
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
                        <>
                          <p className="text-sm">
                            {address.addressLine1 ?? address.landmark ?? "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {address.countryName}
                            {address.cityTown ? ` · ${address.cityTown}` : ""}
                            {address.countyOrStateDisplay !== "—"
                              ? ` · ${address.countyOrStateDisplay}`
                              : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Status: {address.statusCode}
                          </p>
                          {viewingId === address.id ? (
                            <AddressViewSummary address={address} />
                          ) : null}
                        </>
                      )}
                    </div>
                    {editingId === address.id ? null : (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() =>
                            setViewingId((current) =>
                              current === address.id ? null : address.id
                            )
                          }
                        >
                          View
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => startEdit(address)}
                        >
                          Edit
                        </Button>
                        {!address.isDefault &&
                        address.statusCode ===
                          PARTY_ADDRESS_STATUS_CODES.ACTIVE ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => onSetDefault(address.id)}
                          >
                            Set Default
                          </Button>
                        ) : null}
                        {address.statusCode ===
                        PARTY_ADDRESS_STATUS_CODES.ACTIVE ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isPending || address.isDefault}
                            onClick={() => onDeactivate(address.id)}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => onReactivate(address.id)}
                          >
                            Reactivate
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => onRemove(address.id)}
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
          <CardTitle className="text-base">Add Address</CardTitle>
          <CardDescription>
            Addresses are maintained here after registration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="addressTypeCode">Address Type</Label>
            <select
              id="addressTypeCode"
              value={addressTypeCode}
              onChange={(event) => setAddressTypeCode(event.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Select type</option>
              {panel.availableAddressTypes.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="countryCode">Country</Label>
            <select
              id="countryCode"
              value={countryCode}
              onChange={(event) => setCountryCode(event.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Select country</option>
              {panel.countries.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressLine1">Address Line 1</Label>
            <Input
              id="addressLine1"
              value={addressLine1}
              onChange={(event) => setAddressLine1(event.target.value)}
              maxLength={500}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cityTown">{fieldLabels.cityTown}</Label>
            <Input
              id="cityTown"
              value={cityTown}
              onChange={(event) => setCityTown(event.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="countyDistrict">{fieldLabels.countyDistrict}</Label>
            <Input
              id="countyDistrict"
              value={countyDistrict}
              onChange={(event) => setCountyDistrict(event.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stateProvince">{fieldLabels.stateProvince}</Label>
            <Input
              id="stateProvince"
              value={stateProvince}
              onChange={(event) => setStateProvince(event.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wardLocality">{fieldLabels.wardLocality}</Label>
            <Input
              id="wardLocality"
              value={wardLocality}
              onChange={(event) => setWardLocality(event.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal Code</Label>
            <Input
              id="postalCode"
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
              maxLength={20}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gpsLatitude">GPS Latitude (optional)</Label>
              <Input
                id="gpsLatitude"
                value={gpsLatitude}
                onChange={(event) => setGpsLatitude(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gpsLongitude">GPS Longitude (optional)</Label>
              <Input
                id="gpsLongitude"
                value={gpsLongitude}
                onChange={(event) => setGpsLongitude(event.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(event) => setIsDefault(event.target.checked)}
            />
            Mark as default for this type
          </label>
          <div className="space-y-2">
            <Label htmlFor="addressNotes">Notes (optional)</Label>
            <Input
              id="addressNotes"
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
            {isPending ? "Saving…" : "Add Address"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
