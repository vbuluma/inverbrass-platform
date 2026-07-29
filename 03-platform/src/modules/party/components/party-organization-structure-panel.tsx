/**
 * Purpose:
 * Party Workspace Organization Structure tab — tree, CRUD, head office.
 *
 * Engine:
 * ENG-003c – Organization Structure Engine
 */

"use client";

import { useEffect, useRef, useState } from "react";

import {
  PlatformEmptyState,
  PlatformProcessingButton,
  PROCESSING_LABELS,
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
import { getAddressFieldLabels } from "@/core/shared/address";
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

type PhysicalAddressMode = "none" | "existing" | "new";

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

export function PartyOrganizationStructurePanel({
  partyId,
  organizationName,
  initialData,
  showAddForm = false,
}: PartyOrganizationStructurePanelProps) {
  const addFormRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const [syncedPartyId, setSyncedPartyId] = useState(partyId);
  const [showAdd, setShowAdd] = useState(showAddForm);
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
  const [editPhysicalAddressMode, setEditPhysicalAddressMode] =
    useState<PhysicalAddressMode>("none");
  const [editPhysicalCountryCode, setEditPhysicalCountryCode] = useState("");
  const [editPhysicalAddressLine1, setEditPhysicalAddressLine1] = useState("");
  const [editPhysicalCityTown, setEditPhysicalCityTown] = useState("");
  const [editPhysicalCountyDistrict, setEditPhysicalCountyDistrict] =
    useState("");
  const [editOpeningDate, setEditOpeningDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const {
    isPending,
    runPanelAction,
    setValidationError,
    requestConfirm,
    FormFeedback,
    ConfirmDialogHost,
  } = usePanelFeedback<OrganizationStructurePanelView>();
  const {
    draftValues,
    saveDraft,
    clearDraft,
    draftSavedAt,
  } = useFormDraft<{
    unitCode: string;
    unitName: string;
    organizationalUnitTypeCode: string;
    parentOrganizationalUnitId: string;
    isHeadOffice: boolean;
    phone: string;
    email: string;
    partyAddressId: string;
    physicalAddressMode: PhysicalAddressMode;
    physicalCountryCode: string;
    physicalAddressLine1: string;
    physicalCityTown: string;
    physicalCountyDistrict: string;
    physicalGpsLatitude: string;
    physicalGpsLongitude: string;
    openingDate: string;
    notes: string;
  }>(`party-${partyId}-organization-structure-create-draft`);
  const [unitCode, setUnitCode] = useState(() => draftValues?.unitCode ?? "");
  const [unitName, setUnitName] = useState(() => draftValues?.unitName ?? "");
  const [organizationalUnitTypeCode, setOrganizationalUnitTypeCode] = useState(
    () =>
      draftValues?.organizationalUnitTypeCode ??
      initialData.availableUnitTypes[0]?.code ??
      ""
  );
  const [parentOrganizationalUnitId, setParentOrganizationalUnitId] =
    useState(() => draftValues?.parentOrganizationalUnitId ?? "");
  const [isHeadOffice, setIsHeadOffice] = useState(() =>
    Boolean(draftValues?.isHeadOffice)
  );
  const [phone, setPhone] = useState(() => draftValues?.phone ?? "");
  const [email, setEmail] = useState(() => draftValues?.email ?? "");
  const [partyAddressId, setPartyAddressId] = useState(
    () => draftValues?.partyAddressId ?? ""
  );
  const [physicalAddressMode, setPhysicalAddressMode] =
    useState<PhysicalAddressMode>(
      () => draftValues?.physicalAddressMode ?? "none"
    );
  const [physicalCountryCode, setPhysicalCountryCode] = useState(
    () => draftValues?.physicalCountryCode ?? initialData.countries[0]?.code ?? ""
  );
  const [physicalAddressLine1, setPhysicalAddressLine1] = useState(
    () => draftValues?.physicalAddressLine1 ?? ""
  );
  const [physicalCityTown, setPhysicalCityTown] = useState(
    () => draftValues?.physicalCityTown ?? ""
  );
  const [physicalCountyDistrict, setPhysicalCountyDistrict] = useState(
    () => draftValues?.physicalCountyDistrict ?? ""
  );
  const [physicalGpsLatitude, setPhysicalGpsLatitude] = useState(
    () => draftValues?.physicalGpsLatitude ?? ""
  );
  const [physicalGpsLongitude, setPhysicalGpsLongitude] = useState(
    () => draftValues?.physicalGpsLongitude ?? ""
  );
  const [openingDate, setOpeningDate] = useState(
    () => draftValues?.openingDate ?? ""
  );
  const [notes, setNotes] = useState(() => draftValues?.notes ?? "");

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
    setPhysicalAddressMode("none");
    setPhysicalCountryCode(panel.countries[0]?.code ?? "");
    setPhysicalAddressLine1("");
    setPhysicalCityTown("");
    setPhysicalCountyDistrict("");
    setPhysicalGpsLatitude("");
    setPhysicalGpsLongitude("");
    setOpeningDate("");
    setNotes("");
  }

  function applySuccess(data: OrganizationStructurePanelView) {
    setPanel(data);
    setOrganizationalUnitTypeCode(data.availableUnitTypes[0]?.code ?? "");
    resetAddForm();
    setShowAdd(false);
    setEditingId(null);
    setViewingId(null);
  }

  function onSearch() {
    runPanelAction(
      () =>
        searchOrganizationalUnitsAction(partyId, {
          query: searchQuery || undefined,
          organizationalUnitTypeCode: searchTypeCode || undefined,
          statusCode: searchStatusCode || undefined,
        }),
      {
        successTitle: "Search complete.",
        successMessage: "The organizational unit list was updated.",
        onSuccess: (data) => setPanel(data),
      }
    );
  }

  function onAdd() {
    if (!unitCode.trim() || !unitName.trim() || !organizationalUnitTypeCode) {
      setValidationError("Unit code, name, and type are required.");
      return;
    }
    if (physicalAddressMode === "existing" && !partyAddressId) {
      setValidationError("Select an existing physical address.");
      return;
    }
    if (physicalAddressMode === "new") {
      if (!physicalCountryCode || !physicalAddressLine1.trim()) {
        setValidationError(
          "Country and address line 1 are required for a new physical address."
        );
        return;
      }
    }
    runPanelAction(
      () =>
        addOrganizationalUnitAction(partyId, {
          unitCode,
          unitName,
          organizationalUnitTypeCode,
          parentOrganizationalUnitId: parentOrganizationalUnitId || undefined,
          isHeadOffice,
          phone,
          email,
          partyAddressId:
            physicalAddressMode === "existing" ? partyAddressId : undefined,
          newPhysicalAddress:
            physicalAddressMode === "new"
              ? {
                  countryCode: physicalCountryCode,
                  addressLine1: physicalAddressLine1,
                  cityTown: physicalCityTown || undefined,
                  countyDistrict: physicalCountyDistrict || undefined,
                  gpsLatitude: physicalGpsLatitude || null,
                  gpsLongitude: physicalGpsLongitude || null,
                }
              : undefined,
          openingDate: openingDate || undefined,
          notes,
        }),
      {
        successTitle: "Organizational unit created.",
        successMessage: "The unit was added to the organization structure.",
        onSuccess: (data) => {
          applySuccess(data);
          clearDraft();
        },
      }
    );
  }

  function onSaveDraft() {
    saveDraft({
      unitCode,
      unitName,
      organizationalUnitTypeCode,
      parentOrganizationalUnitId,
      isHeadOffice,
      phone,
      email,
      partyAddressId,
      physicalAddressMode,
      physicalCountryCode,
      physicalAddressLine1,
      physicalCityTown,
      physicalCountyDistrict,
      physicalGpsLatitude,
      physicalGpsLongitude,
      openingDate,
      notes,
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
    setEditPhysicalAddressMode(node.partyAddressId ? "existing" : "none");
    setEditPhysicalCountryCode(panel.countries[0]?.code ?? "");
    setEditPhysicalAddressLine1("");
    setEditPhysicalCityTown("");
    setEditPhysicalCountyDistrict("");
    setEditOpeningDate(node.openingDate ?? "");
    setEditNotes(node.notes ?? "");
  }

  function onSaveEdit(organizationalUnitId: string) {
    runPanelAction(
      () =>
        updateOrganizationalUnitAction(partyId, organizationalUnitId, {
          unitName: editName,
          organizationalUnitTypeCode: editTypeCode,
          parentOrganizationalUnitId: editParentId || null,
          phone: editPhone,
          email: editEmail,
          partyAddressId:
            editPhysicalAddressMode === "existing"
              ? editAddressId || null
              : editPhysicalAddressMode === "none"
                ? null
                : undefined,
          newPhysicalAddress:
            editPhysicalAddressMode === "new"
              ? {
                  countryCode: editPhysicalCountryCode,
                  addressLine1: editPhysicalAddressLine1,
                  cityTown: editPhysicalCityTown || undefined,
                  countyDistrict: editPhysicalCountyDistrict || undefined,
                }
              : undefined,
          openingDate: editOpeningDate || undefined,
          notes: editNotes,
        }),
      {
        successTitle: "Organizational unit saved.",
        successMessage: "Unit details were updated.",
        onSuccess: applySuccess,
      }
    );
  }

  function runConfirmedAction(
    confirm: { title: string; description: string; confirmLabel: string },
    action: () => ReturnType<typeof removeHeadOfficeDesignationAction>,
    successTitle: string,
    successMessage: string
  ) {
    requestConfirm({
      ...confirm,
      onConfirm: () => {
        runPanelAction(action, {
          successTitle,
          successMessage,
          onSuccess: applySuccess,
        });
      },
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

  const physicalFieldLabels = getAddressFieldLabels(physicalCountryCode);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">

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
              Create Organizational Unit
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {emptyState ? (
              <PlatformEmptyState
                title="No Organizational Units Yet"
                description="Create organizational units to build out this organization's structure."
                actionLabel="Create Organizational Unit"
                onAction={() => setShowAdd(true)}
                compact
              />
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
                runPanelAction(
                  () => setHeadOfficeOrganizationalUnitAction(partyId, id),
                  {
                    successTitle: "Head Office updated.",
                    successMessage: "The head office designation was changed.",
                    onSuccess: applySuccess,
                  }
                )
              }
              onRemoveHeadOffice={(id) =>
                runConfirmedAction(
                  {
                    title: "Remove Head Office?",
                    description:
                      "This unit will no longer be designated as head office.",
                    confirmLabel: "Remove Head Office",
                  },
                  () => removeHeadOfficeDesignationAction(partyId, id),
                  "Head Office designation removed.",
                  "The head office designation was removed from this unit."
                )
              }
              onDeactivate={(id) =>
                runConfirmedAction(
                  {
                    title: "Deactivate Organizational Unit?",
                    description:
                      "This unit will remain in history but will no longer be active.",
                    confirmLabel: "Deactivate",
                  },
                  () => deactivateOrganizationalUnitAction(partyId, id),
                  "Organizational unit deactivated.",
                  "The unit is no longer active."
                )
              }
              onReactivate={(id) =>
                runPanelAction(
                  () => reactivateOrganizationalUnitAction(partyId, id),
                  {
                    successTitle: "Organizational unit reactivated.",
                    successMessage: "The unit is active again.",
                    onSuccess: applySuccess,
                  }
                )
              }
              onRemove={(id) =>
                runConfirmedAction(
                  {
                    title: "Remove Organizational Unit?",
                    description:
                      "This unit will be removed from the active structure. Historical records may remain in audit history.",
                    confirmLabel: "Remove",
                  },
                  () => removeOrganizationalUnitAction(partyId, id),
                  "Organizational unit removed.",
                  "The unit was removed from the organization structure."
                )
              }
              renderViewDetails={(node) => (
                <div className="space-y-1 rounded-md border border-border/60 bg-muted/30 px-3 py-2 pt-2 text-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Summary
                  </p>
                  <p>Status: {node.statusCode}</p>
                  {node.openingDate ? (
                    <p>Opening date: {formatDate(node.openingDate)}</p>
                  ) : null}
                  {node.statusCode === ORGANIZATIONAL_UNIT_STATUS_CODES.INACTIVE &&
                  node.closingDate ? (
                    <p>Date deactivated: {formatDate(node.closingDate)}</p>
                  ) : null}
                  <p>Phone: {node.phone ?? "—"}</p>
                  <p>Email: {node.email ?? "—"}</p>
                  <p>
                    Physical address: {node.partyAddressLabel ?? "—"}
                  </p>
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
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Physical Address</Label>
                    <select
                      value={editPhysicalAddressMode}
                      onChange={(event) =>
                        setEditPhysicalAddressMode(
                          event.target.value as PhysicalAddressMode
                        )
                      }
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    >
                      <option value="none">None</option>
                      <option value="existing">Select existing</option>
                      <option value="new">Capture new</option>
                    </select>
                    {editPhysicalAddressMode === "existing" ? (
                      <select
                        value={editAddressId}
                        onChange={(event) => setEditAddressId(event.target.value)}
                        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      >
                        <option value="">Select physical address</option>
                        {panel.physicalAddressOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    {editPhysicalAddressMode === "new" ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <select
                          value={editPhysicalCountryCode}
                          onChange={(event) =>
                            setEditPhysicalCountryCode(event.target.value)
                          }
                          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm sm:col-span-2"
                        >
                          <option value="">Country</option>
                          {panel.countries.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.name}
                            </option>
                          ))}
                        </select>
                        <Input
                          value={editPhysicalAddressLine1}
                          onChange={(event) =>
                            setEditPhysicalAddressLine1(event.target.value)
                          }
                          placeholder="Address line 1"
                          className="sm:col-span-2"
                        />
                        <Input
                          value={editPhysicalCityTown}
                          onChange={(event) =>
                            setEditPhysicalCityTown(event.target.value)
                          }
                          placeholder="City / Town"
                        />
                        <Input
                          value={editPhysicalCountyDistrict}
                          onChange={(event) =>
                            setEditPhysicalCountyDistrict(event.target.value)
                          }
                          placeholder="County / District"
                        />
                      </div>
                    ) : null}
                  </div>
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
            <CardTitle className="text-base">Create Organizational Unit</CardTitle>
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
            <div className="space-y-3 rounded-lg border border-border/60 p-3">
              <Label>Physical Address (optional)</Label>
              <select
                value={physicalAddressMode}
                onChange={(event) =>
                  setPhysicalAddressMode(event.target.value as PhysicalAddressMode)
                }
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="none">None</option>
                <option value="existing">Select existing physical address</option>
                <option value="new">Capture new physical address</option>
              </select>
              {physicalAddressMode === "existing" ? (
                <select
                  id="unitAddressId"
                  value={partyAddressId}
                  onChange={(event) => setPartyAddressId(event.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select physical address</option>
                  {panel.physicalAddressOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : null}
              {physicalAddressMode === "new" ? (
                <div className="grid gap-2">
                  <select
                    value={physicalCountryCode}
                    onChange={(event) => setPhysicalCountryCode(event.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Select country</option>
                    {panel.countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={physicalAddressLine1}
                    onChange={(event) => setPhysicalAddressLine1(event.target.value)}
                    placeholder="Address line 1"
                  />
                  <Input
                    value={physicalCityTown}
                    onChange={(event) => setPhysicalCityTown(event.target.value)}
                    placeholder={physicalFieldLabels.cityTown}
                  />
                  <Input
                    value={physicalCountyDistrict}
                    onChange={(event) =>
                      setPhysicalCountyDistrict(event.target.value)
                    }
                    placeholder={physicalFieldLabels.countyDistrict}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      value={physicalGpsLatitude}
                      onChange={(event) => setPhysicalGpsLatitude(event.target.value)}
                      placeholder="GPS latitude (optional)"
                    />
                    <Input
                      value={physicalGpsLongitude}
                      onChange={(event) => setPhysicalGpsLongitude(event.target.value)}
                      placeholder="GPS longitude (optional)"
                    />
                  </div>
                </div>
              ) : null}
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
            <PlatformProcessingButton
              type="button"
              className="w-full"
              isProcessing={isPending}
              processingLabel={PROCESSING_LABELS.saving}
              idleLabel="Create Organizational Unit"
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
              processingLabel={PROCESSING_LABELS.saving}
              draftSavedAt={draftSavedAt}
            />
          </CardContent>
        </Card>
      ) : null}
      <ConfirmDialogHost />
    </div>
  );
}
