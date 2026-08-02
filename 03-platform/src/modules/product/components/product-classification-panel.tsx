/**
 * Purpose:
 * Product Classification panel — assignments on Product Workspace.
 *
 * Implementation Package:
 * BP-003 / IP-002 – Product Classification & Categorization
 */

"use client";

import { StarIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import {
  PlatformEmptyState,
  PlatformProcessingButton,
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
import { Label } from "@/components/ui/label";
import {
  assignProductClassificationAction,
  removeProductClassificationAssignmentAction,
  setPrimaryProductClassificationAction,
} from "@/modules/product/actions/product-classification-actions";
import { useBusinessTerminology } from "@/core/industry-experience/business-terminology-context";
import { useProductUiLabels } from "@/modules/product/product-terminology-labels";
import type { ProductClassificationPanelView } from "@/modules/product/types";

type ProductClassificationPanelProps = {
  productId: string;
  initialData: ProductClassificationPanelView;
  disabled?: boolean;
};

export function ProductClassificationPanel({
  productId,
  initialData,
  disabled = false,
}: ProductClassificationPanelProps) {
  const labels = useProductUiLabels();
  const terminology = useBusinessTerminology();
  const offeringLower = terminology.offerings.singular.toLowerCase();
  const offeringsLower = terminology.offerings.plural.toLowerCase();
  const [panel, setPanel] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const [selectedClassificationId, setSelectedClassificationId] = useState("");
  const [makePrimary, setMakePrimary] = useState(false);
  const {
    isPending,
    runPanelAction,
    setValidationError,
    requestConfirm,
    FormFeedback,
    ConfirmDialogHost,
  } = usePanelFeedback<ProductClassificationPanelView>();

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setPanel(initialData);
  }

  function applySuccess(data: ProductClassificationPanelView) {
    setPanel(data);
    setSelectedClassificationId("");
    setMakePrimary(false);
  }

  function onAssign(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedClassificationId) {
      setValidationError("Select a classification.");
      return;
    }

    runPanelAction(
      () =>
        assignProductClassificationAction(productId, {
          classificationId: selectedClassificationId,
          isPrimary: makePrimary,
        }),
      {
        successTitle: "Classification assigned.",
        successMessage: `This ${offeringLower} now belongs to the selected classification.`,
        onSuccess: applySuccess,
      }
    );
  }

  function onSetPrimary(assignmentId: string) {
    runPanelAction(
      () => setPrimaryProductClassificationAction(productId, { assignmentId }),
      {
        successTitle: "Primary classification updated.",
        successMessage: `The primary classification for this ${offeringLower} was changed.`,
        onSuccess: applySuccess,
      }
    );
  }

  function onRemove(assignmentId: string) {
    requestConfirm({
      title: "Remove classification assignment?",
      description:
        `This ${offeringLower} will no longer belong to this classification. You can reassign it later.`,
      confirmLabel: "Remove",
      onConfirm: () => {
        runPanelAction(
          () =>
            removeProductClassificationAssignmentAction(productId, assignmentId),
          {
            successTitle: "Assignment removed.",
            successMessage: "The classification assignment was removed.",
            onSuccess: applySuccess,
          }
        );
      },
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{labels.catalogueStructure.primaryAssignment}</CardTitle>
          <CardDescription>
            Exactly one primary classification when multiple assignments exist.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {panel.primaryClassification ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
              <div>
                <p className="font-medium">
                  {panel.primaryClassification.classificationName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {panel.primaryClassification.classificationCode}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-sm text-amber-700">
                <StarIcon className="size-4 fill-current" aria-hidden />
                Primary
              </span>
            </div>
          ) : (
            <PlatformEmptyState
              title="No Primary Classification"
              description="Assign a classification below. The first assignment becomes primary automatically."
            />
          )}
        </CardContent>
      </Card>

      {panel.additionalClassifications.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{labels.catalogueStructure.additionalAssignments}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {panel.additionalClassifications.map((assignment) => (
              <div
                key={assignment.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">{assignment.classificationName}</p>
                  <p className="text-sm text-muted-foreground">
                    {assignment.classificationCode}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={disabled || isPending}
                    onClick={() => onSetPrimary(assignment.id)}
                  >
                    Set Primary
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={disabled || isPending}
                    onClick={() => onRemove(assignment.id)}
                  >
                    <Trash2Icon className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {!disabled && panel.availableClassifications.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{labels.catalogueStructure.assignCategory}</CardTitle>
            <CardDescription>
              {terminology.offerings.plural} may belong to multiple classifications across your hierarchy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onAssign} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="classificationId">Classification</Label>
                <select
                  id="classificationId"
                  className="flex h-10 w-full max-w-xl rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedClassificationId}
                  onChange={(event) =>
                    setSelectedClassificationId(event.target.value)
                  }
                  required
                >
                  <option value="">Select classification…</option>
                  {panel.availableClassifications.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} — {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={makePrimary}
                  onChange={(event) => setMakePrimary(event.target.checked)}
                />
                Set as primary classification
              </label>
              <FormFeedback processingLabel="Assigning…" />
              <PlatformProcessingButton
                type="submit"
                isProcessing={isPending}
                processingLabel="Assigning…"
                idleLabel="Assign Classification"
              />
            </form>
          </CardContent>
        </Card>
      ) : null}

      {panel.assignments.length === 0 &&
      panel.availableClassifications.length === 0 ? (
        <PlatformEmptyState
          title="No Classifications Available"
          description={`Create classifications from the Classification Dashboard before assigning ${offeringsLower}.`}
          actionLabel={`Open ${labels.catalogueStructure.moduleName}`}
          actionHref="/products/classifications"
        />
      ) : null}

      <ConfirmDialogHost />
    </div>
  );
}
