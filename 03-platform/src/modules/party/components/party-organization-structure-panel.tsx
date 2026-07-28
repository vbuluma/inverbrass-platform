/**
 * Purpose:
 * Party Workspace Organization Structure tab — tree, CRUD, head office.
 *
 * Engine:
 * ENG-003c – Organization Structure Engine
 */

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

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
  addOrganizationalUnitAction,
  deactivateOrganizationalUnitAction,
  reactivateOrganizationalUnitAction,
  removeHeadOfficeDesignationAction,
  removeOrganizationalUnitAction,
  searchOrganizationalUnitsAction,
  setHeadOfficeOrganizationalUnitAction,
  updateOrganizationalUnitAction,
} from "@/modules/party/actions/organizational-unit-actions";
import { OrganizationalUnitTree } from "@/modules/party/components/organizational-unit-tree";
import { ORGANIZATIONAL_UNIT_STATUS_CODES } from "@/modules/party/constants";
import type {
  OrganizationStructurePanelView,
  OrganizationalUnitTreeNode,
} from "@/modules/party/types";

type PartyOrganizationStructurePanelProps = {
  partyId: string;
  organizationName: string;
  initialData: OrganizationStructurePanelView;
  showAddForm?: boolean;
};

export function PartyOrganizationStructurePanel({
  partyId,
  organizationName,
  initialData,
  showAddForm = false,
}: PartyOrganizationStructurePanelProps) {
  const router = useRouter();
  const addFormRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const [syncedPartyId, setSyncedPartyId] = useState(partyId);
  const [showAdd, setShowAdd] = useState(showAddForm);
  const [unitCode, setUnitCode] = useState("");
  const [unitName, setUnitName] = useState("");
  const [organizationalUnitTypeCode, setOrganizationalUnitTypeCode] = useState(
    initialData.availableUnitTypes[0]?.code ?? ""
  );
  const [parentOrganizationalUnitId, setParentOrganizationalUnitId] =
    useState("");
  const [isHeadOffice, setIsHeadOffice] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [partyAddressId, setPartyAddressId] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [openingDate, setOpeningDate] = useState("");
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTypeCode, setSearchTypeCode] = useState("");
  const [searchStatusCode, setSearchStatusCode] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTypeCode, setEditTypeCode] = useState("");
  const [editParentId, setEditParentId] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddressId, setEditAddressId] = useState("");
  const [editCountryCode, setEditCountryCode] = useState("");
  const [editLatitude, setEditLatitude] = useState("");
  const [editLongitude, setEditLongitude] = useState("");
  const [editOpeningDate, setEditOpeningDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (showAddForm && addFormRef.current) {
      addFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showAddForm]);

  if (partyId !== syncedPartyId) {
    setSyncedPartyId(partyId);
    resetAddForm();
    setSearchQuery("");
    setSearchTypeCode("");
    setSearchStatusCode("");
    setViewingId(null);
    setEditingId(null);
    setError(null);
    setMessage(null);
  }

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setPanel(initialData);
    setOrganizationalUnitTypeCode(
      initialData.availableUnitTypes[0]?.code ?? ""
    );
  }

  function resetAddForm() {
    setUnitCode("");
    setUnitName("");
    setOrganizationalUnitTypeCode(panel.availableUnitTypes[0]?.code ?? "");
    setParentOrganizationalUnitId("");
    setIsHeadOffice(false);
    setPhone("");
    setEmail("");
    setPartyAddressId("");
    setCountryCode("");
    setLatitude("");
    setLongitude("");
    setOpeningDate("");
    setNotes("");
  }

  function applyPanelResult(
    result:
      | { success: true; data: OrganizationStructurePanelView }
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
    setOrganizationalUnitTypeCode(
      result.data.availableUnitTypes[0]?.code ?? ""
    );
    resetAddForm();
    setEditingId(null);
    setViewingId(null);
    router.refresh();
  }

  function onSearch() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await searchOrganizationalUnitsAction(partyId, {
        query: searchQuery || undefined,
        organizationalUnitTypeCode: searchTypeCode || undefined,
        statusCode: searchStatusCode || undefined,
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setPanel(result.data);
    });
  }

  function onAdd() {
    if (!unitCode.trim() || !unitName.trim() || !organizationalUnitTypeCode) {
      setError("Unit code, name, and type are required.");
      return;
    }
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await addOrganizationalUnitAction(partyId, {
        unitCode,
        unitName,
        organizationalUnitTypeCode,
        parentOrganizationalUnitId: parentOrganizationalUnitId || undefined,
        isHeadOffice,
        phone,
        email,
        partyAddressId: partyAddressId || undefined,
        countryCode: countryCode || undefined,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        openingDate: openingDate || undefined,
        notes,
      });
      applyPanelResult(result, "Organizational unit added.");
    });
  }

  function startEdit(node: OrganizationalUnitTreeNode) {
    setEditingId(node.id);
    setViewingId(null);
    setEditName(node.unitName);
    setEditTypeCode(node.organizationalUnitTypeCode);
    setEditParentId(node.parentOrganizationalUnitId ?? "");
    setEditPhone(node.phone ?? "");
    setEditEmail(node.email ?? "");
    setEditAddressId(node.partyAddressId ?? "");
    setEditCountryCode(node.countryCode ?? "");
    setEditLatitude(node.latitude ?? "");
    setEditLongitude(node.longitude ?? "");
    setEditOpeningDate(node.openingDate ?? "");
    setEditNotes(node.notes ?? "");
    setError(null);
    setMessage(null);
  }

  function onSaveEdit(organizationalUnitId: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateOrganizationalUnitAction(
        partyId,
        organizationalUnitId,
        {
          unitName: editName,
          organizationalUnitTypeCode: editTypeCode,
          parentOrganizationalUnitId: editParentId || null,
          phone: editPhone,
          email: editEmail,
          partyAddressId: editAddressId || null,
          countryCode: editCountryCode || null,
          latitude: editLatitude || null,
          longitude: editLongitude || null,
          openingDate: editOpeningDate || undefined,
          notes: editNotes,
        }
      );
      applyPanelResult(result, "Organizational unit updated.");
    });
  }

  function runAction(
    action: () => Promise<
      | { success: true; data: OrganizationStructurePanelView }
      | { success: false; error: { message: string } }
    >,
    successMessage: string
  ) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      applyPanelResult(await action(), successMessage);
    });
  }

  if (!panel.isOrganization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization Structure</CardTitle>
          <CardDescription>
            Organizational Units are only available for Organization parties.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const emptyState =
    panel.summary.hasOnlyHeadOffice || panel.units.length === 0;

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
            <CardTitle className="text-base">Summary</CardTitle>
            <CardDescription>
              Total {panel.summary.total} · Active {panel.summary.active} ·
              Inactive {panel.summary.inactive}
              {panel.summary.headOfficeName
                ? ` · Head Office: ${panel.summary.headOfficeName}`
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-3">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search name or code…"
            />
            <select
              value={searchTypeCode}
              onChange={(event) => setSearchTypeCode(event.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">All types</option>
              {panel.availableUnitTypes.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <select
                value={searchStatusCode}
                onChange={(event) => setSearchStatusCode(event.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">All statuses</option>
                <option value={ORGANIZATIONAL_UNIT_STATUS_CODES.ACTIVE}>
                  Active
                </option>
                <option value={ORGANIZATIONAL_UNIT_STATUS_CODES.INACTIVE}>
                  Inactive
                </option>
              </select>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={onSearch}
              >
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Organization Structure</CardTitle>
              <CardDescription>
                Hierarchical view of organizational units.
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setShowAdd(true);
                addFormRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            >
              Add Organizational Unit
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {emptyState ? (
              <div className="space-y-3 rounded-lg border border-dashed px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No additional Organizational Units have been created.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowAdd(true)}
                >
                  Add Organizational Unit
                </Button>
              </div>
            ) : null}
            <OrganizationalUnitTree
              nodes={panel.tree}
              organizationName={organizationName}
              viewingId={viewingId}
              editingId={editingId}
              isPending={isPending}
              onView={(id) =>
                setViewingId((current) => (current === id ? null : id))
              }
              onEdit={startEdit}
              onSetHeadOffice={(id) =>
                runAction(
                  () => setHeadOfficeOrganizationalUnitAction(partyId, id),
                  "Head Office updated."
                )
              }
              onRemoveHeadOffice={(id) =>
                runAction(
                  () => removeHeadOfficeDesignationAction(partyId, id),
                  "Head Office designation removed."
                )
              }
              onDeactivate={(id) =>
                runAction(
                  () => deactivateOrganizationalUnitAction(partyId, id),
                  "Organizational unit deactivated."
                )
              }
              onReactivate={(id) =>
                runAction(
                  () => reactivateOrganizationalUnitAction(partyId, id),
                  "Organizational unit reactivated."
                )
              }
              onRemove={(id) =>
                runAction(
                  () => removeOrganizationalUnitAction(partyId, id),
                  "Organizational unit removed."
                )
              }
              renderViewDetails={(node) => (
                <div className="space-y-1 pt-2 text-sm">
                  <p>Phone: {node.phone ?? "—"}</p>
                  <p>Email: {node.email ?? "—"}</p>
                  <p>Location: {node.locationDisplay}</p>
                  <p>Notes: {node.notes ?? "—"}</p>
                </div>
              )}
              renderEditForm={(node) => (
                <div className="grid gap-2 pt-2 sm:grid-cols-2">
                  <Input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                  />
                  <select
                    value={editTypeCode}
                    onChange={(event) => setEditTypeCode(event.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    {panel.availableUnitTypes.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={editParentId}
                    onChange={(event) => setEditParentId(event.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm sm:col-span-2"
                  >
                    <option value="">No parent unit</option>
                    {panel.parentUnitOptions
                      .filter((option) => option.code !== node.id)
                      .map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.name}
                        </option>
                      ))}
                  </select>
                  <Input
                    value={editPhone}
                    onChange={(event) => setEditPhone(event.target.value)}
                    placeholder="Phone"
                  />
                  <Input
                    value={editEmail}
                    onChange={(event) => setEditEmail(event.target.value)}
                    placeholder="Email"
                  />
                  <Input
                    value={editCountryCode}
                    onChange={(event) => setEditCountryCode(event.target.value)}
                    placeholder="Country (ISO)"
                    maxLength={2}
                  />
                  <Input
                    value={editLatitude}
                    onChange={(event) => setEditLatitude(event.target.value)}
                    placeholder="Latitude"
                  />
                  <Input
                    value={editLongitude}
                    onChange={(event) => setEditLongitude(event.target.value)}
                    placeholder="Longitude"
                  />
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={isPending}
                      onClick={() => onSaveEdit(node.id)}
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
              )}
            />
          </CardContent>
        </Card>
      </div>

      {showAdd ? (
        <Card className="h-fit" ref={addFormRef}>
          <CardHeader>
            <CardTitle className="text-base">Add Organizational Unit</CardTitle>
            <CardDescription>
              Register a unit within this organization&apos;s structure.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unitCode">Unit Code</Label>
              <Input
                id="unitCode"
                value={unitCode}
                onChange={(event) => setUnitCode(event.target.value)}
                maxLength={30}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitName">Unit Name</Label>
              <Input
                id="unitName"
                value={unitName}
                onChange={(event) => setUnitName(event.target.value)}
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organizationalUnitTypeCode">Unit Type</Label>
              <select
                id="organizationalUnitTypeCode"
                value={organizationalUnitTypeCode}
                onChange={(event) =>
                  setOrganizationalUnitTypeCode(event.target.value)
                }
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Select type</option>
                {panel.availableUnitTypes.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentOrganizationalUnitId">Parent Unit</Label>
              <select
                id="parentOrganizationalUnitId"
                value={parentOrganizationalUnitId}
                onChange={(event) =>
                  setParentOrganizationalUnitId(event.target.value)
                }
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">None</option>
                {panel.parentUnitOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isHeadOffice}
                onChange={(event) => setIsHeadOffice(event.target.checked)}
              />
              Designate as Head Office
            </label>
            <div className="space-y-2">
              <Label htmlFor="unitPhone">Phone (optional)</Label>
              <Input
                id="unitPhone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitEmail">Email (optional)</Label>
              <Input
                id="unitEmail"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitAddressId">Party Address (optional)</Label>
              <select
                id="unitAddressId"
                value={partyAddressId}
                onChange={(event) => setPartyAddressId(event.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">None</option>
                {panel.availableAddresses.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Input
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                placeholder="Country"
                maxLength={2}
              />
              <Input
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
                placeholder="Latitude"
              />
              <Input
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
                placeholder="Longitude"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="openingDate">Opening Date (optional)</Label>
              <Input
                id="openingDate"
                type="date"
                value={openingDate}
                onChange={(event) => setOpeningDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitNotes">Notes (optional)</Label>
              <Input
                id="unitNotes"
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
              {isPending ? "Saving…" : "Add Organizational Unit"}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
