/**
 * Purpose:
 * Product Workspace Relationships tab — search, add, edit, deactivate, remove.
 *
 * Implementation Package:
 * BP-003 / IP-010 – Offering Relationships
 */

"use client";

import Link from "next/link";
import { useState } from "react";

import {
  PlatformEmptyState,
  PlatformSearchState,
  type PlatformSearchStateStatus,
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
import {
  addOfferingRelationshipAction,
  deactivateOfferingRelationshipAction,
  reactivateOfferingRelationshipAction,
  removeOfferingRelationshipAction,
  searchOfferingsForRelationshipAction,
  updateOfferingRelationshipAction,
} from "@/modules/product/actions/offering-relationship-actions";
import { OFFERING_RELATIONSHIP_STATUS_CODES } from "@/modules/product/constants";
import { useProductUiLabels } from "@/modules/product/product-terminology-labels";
import type {
  OfferingRelationshipsPanelView,
  OfferingRelationshipView,
  ProductSummaryView,
} from "@/modules/product/types";

type OfferingRelationshipsPanelProps = {
  productId: string;
  initialData: OfferingRelationshipsPanelView;
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

function RelationshipSection({
  title,
  relationships,
  editingId,
  editEffectiveFrom,
  editEffectiveTo,
  editNotes,
  isPending,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDeactivate,
  onReactivate,
  onRemove,
  setEditEffectiveFrom,
  setEditEffectiveTo,
  setEditNotes,
}: {
  title: string;
  relationships: OfferingRelationshipView[];
  editingId: string | null;
  editEffectiveFrom: string;
  editEffectiveTo: string;
  editNotes: string;
  isPending: boolean;
  onStartEdit: (relationship: OfferingRelationshipView) => void;
  onSaveEdit: (relationshipId: string) => void;
  onCancelEdit: () => void;
  onDeactivate: (relationshipId: string) => void;
  onReactivate: (relationshipId: string) => void;
  onRemove: (relationshipId: string) => void;
  setEditEffectiveFrom: (value: string) => void;
  setEditEffectiveTo: (value: string) => void;
  setEditNotes: (value: string) => void;
}) {
  if (relationships.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="space-y-3">
        {relationships.map((relationship) => (
          <li
            key={relationship.id}
            className="space-y-2 rounded-lg border px-3 py-3"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium">
                <Link
                  href={`/products/${relationship.relatedOfferingId}`}
                  className="hover:underline"
                >
                  {relationship.relatedOfferingName}
                </Link>
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {relationship.relatedOfferingCode}
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
                    value={editEffectiveFrom}
                    onChange={(event) =>
                      setEditEffectiveFrom(event.target.value)
                    }
                  />
                  <Input
                    type="date"
                    value={editEffectiveTo}
                    onChange={(event) => setEditEffectiveTo(event.target.value)}
                    placeholder="End date"
                  />
                  <Input
                    value={editNotes}
                    onChange={(event) => setEditNotes(event.target.value)}
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
                      onClick={onCancelEdit}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Effective: {formatDate(relationship.effectiveFrom)} · End:{" "}
                  {formatDate(relationship.effectiveTo)} · Status:{" "}
                  {relationship.statusCode}
                  {relationship.notes ? ` · ${relationship.notes}` : ""}
                </p>
              )}
            </div>
            {editingId !== relationship.id ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => onStartEdit(relationship)}
                >
                  Edit
                </Button>
                {relationship.statusCode ===
                OFFERING_RELATIONSHIP_STATUS_CODES.ACTIVE ? (
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
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OfferingRelationshipsPanel({
  productId,
  initialData,
}: OfferingRelationshipsPanelProps) {
  const labels = useProductUiLabels();
  const [panel, setPanel] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const [syncedProductId, setSyncedProductId] = useState(productId);
  const [searchResults, setSearchResults] = useState<ProductSummaryView[]>([]);
  const [searchStatus, setSearchStatus] =
    useState<PlatformSearchStateStatus>("idle");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEffectiveFrom, setEditEffectiveFrom] = useState("");
  const [editEffectiveTo, setEditEffectiveTo] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const {
    isPending,
    runPanelAction,
    clearResult,
    setValidationError,
    requestConfirm,
    FormFeedback,
    ConfirmDialogHost,
  } = usePanelFeedback<OfferingRelationshipsPanelView>();
  const { draftValues, saveDraft, clearDraft, draftSavedAt } = useFormDraft<{
    searchQuery: string;
    selectedOfferingId: string;
    relationshipTypeCode: string;
    effectiveFrom: string;
    notes: string;
  }>(`product-${productId}-relationships-create-draft`);
  const [searchQuery, setSearchQuery] = useState(
    () => draftValues?.searchQuery ?? ""
  );
  const [selectedOfferingId, setSelectedOfferingId] = useState(
    () => draftValues?.selectedOfferingId ?? ""
  );
  const [relationshipTypeCode, setRelationshipTypeCode] = useState(
    () =>
      draftValues?.relationshipTypeCode ??
      initialData.availableRelationshipTypes[0]?.code ??
      ""
  );
  const [effectiveFrom, setEffectiveFrom] = useState(
    () => draftValues?.effectiveFrom ?? ""
  );
  const [notes, setNotes] = useState(() => draftValues?.notes ?? "");

  if (productId !== syncedProductId) {
    setSyncedProductId(productId);
    setSearchQuery("");
    setSearchResults([]);
    setSearchStatus("idle");
    setSearchError(null);
    setSelectedOfferingId("");
    setEffectiveFrom("");
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

  function applySuccess(data: OfferingRelationshipsPanelView) {
    setPanel(data);
    setRelationshipTypeCode(data.availableRelationshipTypes[0]?.code ?? "");
    setSearchQuery("");
    setSearchResults([]);
    setSearchStatus("idle");
    setSearchError(null);
    setSelectedOfferingId("");
    setEffectiveFrom("");
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
          const result = await searchOfferingsForRelationshipAction(
            productId,
            searchQuery
          );
          if (!result.success) {
            setSearchStatus("error");
            setSearchError(result.error.message);
            return result;
          }
          setSearchResults(result.data);
          setSelectedOfferingId(result.data[0]?.id ?? "");
          setSearchStatus(result.data.length > 0 ? "success" : "empty");
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
        successMessage: "Select a product from the results to create a relationship.",
        onSuccess: () => clearResult(),
      }
    );
  }

  function onAdd() {
    if (!selectedOfferingId) {
      setValidationError("Search and select a related product.");
      return;
    }
    if (selectedOfferingId === productId) {
      setValidationError("A product cannot relate to itself.");
      return;
    }
    if (!relationshipTypeCode) {
      setValidationError("Select a relationship type.");
      return;
    }
    runPanelAction(
      () =>
        addOfferingRelationshipAction(productId, {
          targetOfferingId: selectedOfferingId,
          relationshipTypeCode,
          effectiveFrom: effectiveFrom || undefined,
          notes,
        }),
      {
        successTitle: "Relationship created successfully.",
        successMessage: "The relationship is now linked to this product.",
        onSuccess: (data) => {
          applySuccess(data);
          clearDraft();
        },
      }
    );
  }

  function startEdit(relationship: OfferingRelationshipView) {
    setEditingId(relationship.id);
    setEditEffectiveFrom(relationship.effectiveFrom);
    setEditEffectiveTo(relationship.effectiveTo ?? "");
    setEditNotes(relationship.notes ?? "");
  }

  function onSaveEdit(offeringRelationshipId: string) {
    runPanelAction(
      () =>
        updateOfferingRelationshipAction(productId, offeringRelationshipId, {
          effectiveFrom: editEffectiveFrom,
          effectiveTo: editEffectiveTo,
          notes: editNotes,
        }),
      {
        successTitle: "Relationship saved.",
        successMessage: "Relationship details were updated.",
        onSuccess: applySuccess,
      }
    );
  }

  function onDeactivate(offeringRelationshipId: string) {
    requestConfirm({
      title: "Deactivate Relationship?",
      description:
        "This relationship will remain in history but will no longer be active.",
      confirmLabel: "Deactivate",
      onConfirm: () => {
        runPanelAction(
          () =>
            deactivateOfferingRelationshipAction(productId, offeringRelationshipId),
          {
            successTitle: "Relationship deactivated.",
            successMessage: "The relationship is no longer active.",
            onSuccess: applySuccess,
          }
        );
      },
    });
  }

  function onReactivate(offeringRelationshipId: string) {
    runPanelAction(
      () => reactivateOfferingRelationshipAction(productId, offeringRelationshipId),
      {
        successTitle: "Relationship reactivated.",
        successMessage: "The relationship is active again.",
        onSuccess: applySuccess,
      }
    );
  }

  function onRemove(offeringRelationshipId: string) {
    requestConfirm({
      title: "Remove Relationship?",
      description:
        "This relationship will be removed from the active list. Historical records may remain in audit history.",
      confirmLabel: "Remove",
      onConfirm: () => {
        runPanelAction(
          () => removeOfferingRelationshipAction(productId, offeringRelationshipId),
          {
            successTitle: "Relationship removed.",
            successMessage: "The relationship was removed from this product.",
            onSuccess: applySuccess,
          }
        );
      },
    });
  }

  const sectionProps = {
    editingId,
    editEffectiveFrom,
    editEffectiveTo,
    editNotes,
    isPending,
    onStartEdit: startEdit,
    onSaveEdit,
    onCancelEdit: () => setEditingId(null),
    onDeactivate,
    onReactivate,
    onRemove,
    setEditEffectiveFrom,
    setEditEffectiveTo,
    setEditNotes,
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Relationships</CardTitle>
            <CardDescription>
              Links between this product and other offerings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {panel.relationships.length === 0 ? (
              <PlatformEmptyState
                title="No Relationships Yet"
                description="Search for an existing product to create your first relationship."
                actionLabel="Create Relationship"
                onAction={() => document.getElementById("offeringSearch")?.focus()}
                compact
              />
            ) : (
              <>
                <RelationshipSection
                  title={labels.relationships.requiredOfferings}
                  relationships={panel.sections.required}
                  {...sectionProps}
                />
                <RelationshipSection
                  title={labels.relationships.optionalOfferings}
                  relationships={panel.sections.optional}
                  {...sectionProps}
                />
                <RelationshipSection
                  title="Cross Sell"
                  relationships={panel.sections.crossSell}
                  {...sectionProps}
                />
                <RelationshipSection
                  title="Upgrade Path"
                  relationships={panel.sections.upgradePath}
                  {...sectionProps}
                />
                <RelationshipSection
                  title={labels.relationships.alternativeOfferings}
                  relationships={panel.sections.alternatives}
                  {...sectionProps}
                />
                <RelationshipSection
                  title="Compatibility"
                  relationships={panel.sections.compatibility}
                  {...sectionProps}
                />
                <RelationshipSection
                  title="Dependencies"
                  relationships={panel.sections.dependencies}
                  {...sectionProps}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Relationship</CardTitle>
          <CardDescription>
            Search for an existing product, then choose a relationship type.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="offeringSearch">{labels.relationships.searchProductsLabel}</Label>
            <div className="flex gap-2">
              <Input
                id="offeringSearch"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={labels.relationships.productNameOrCode}
                disabled={isPending}
              />
              <PlatformProcessingButton
                type="button"
                size="sm"
                isProcessing={isPending}
                processingLabel="Searching…"
                idleLabel="Search"
                onClick={onSearch}
              >
                Search
              </PlatformProcessingButton>
            </div>
          </div>

          <PlatformSearchState
            status={searchStatus}
            errorMessage={searchError ?? undefined}
            onRetry={onSearch}
            emptyTitle="No products found"
            emptyHints={[
              "A different product name or code",
              "Removing extra filters",
              "Creating the product first",
            ]}
          >
            {searchResults.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="selectedOffering">Related Product</Label>
                <select
                  id="selectedOffering"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={selectedOfferingId}
                  onChange={(event) => setSelectedOfferingId(event.target.value)}
                  disabled={isPending}
                >
                  {searchResults.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.productName} ({product.productCode})
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
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={relationshipTypeCode}
              onChange={(event) => setRelationshipTypeCode(event.target.value)}
              disabled={isPending}
            >
              {panel.availableRelationshipTypes.map((type) => (
                <option key={type.code} value={type.code}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="effectiveFrom">Effective From</Label>
            <Input
              id="effectiveFrom"
              type="date"
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="relationshipNotes">Notes</Label>
            <Input
              id="relationshipNotes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isPending}
              placeholder="Optional notes"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <PlatformProcessingButton
              type="button"
              isProcessing={isPending}
              processingLabel={PROCESSING_LABELS.saving}
              idleLabel="Add Relationship"
              onClick={onAdd}
            >
              Add Relationship
            </PlatformProcessingButton>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() =>
                saveDraft({
                  searchQuery,
                  selectedOfferingId,
                  relationshipTypeCode,
                  effectiveFrom,
                  notes,
                })
              }
            >
              Save Draft
            </Button>
          </div>

          <FormFeedback
            processingLabel={PROCESSING_LABELS.saving}
            draftSavedAt={draftSavedAt}
          />
        </CardContent>
      </Card>

      <ConfirmDialogHost />
    </div>
  );
}
