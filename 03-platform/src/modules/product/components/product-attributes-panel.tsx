/**
 * Purpose:
 * Product Workspace Attributes tab — dynamic attribute values grouped by attribute group.
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
 */

"use client";

import { useMemo, useState } from "react";

import {
  PlatformEmptyState,
  PlatformFormActionFooter,
  PlatformProcessingButton,
  PROCESSING_LABELS,
  useAsyncAction,
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
import { saveProductAttributeValuesAction } from "@/modules/product/actions/attribute-actions";
import { DynamicAttributeRenderer } from "@/modules/product/components/dynamic-attribute-renderer";
import { useBusinessTerminology } from "@/core/industry-experience/business-terminology-context";
import { useProductUiLabels } from "@/modules/product/product-terminology-labels";
import type { ProductAttributesPanelView } from "@/modules/product/types";

type ProductAttributesPanelProps = {
  productId: string;
  initialData: ProductAttributesPanelView;
  disabled?: boolean;
};

export function ProductAttributesPanel({
  productId,
  initialData,
  disabled = false,
}: ProductAttributesPanelProps) {
  const labels = useProductUiLabels();
  const terminology = useBusinessTerminology();
  const offeringLower = terminology.offerings.singular.toLowerCase();
  const [panel, setPanel] = useState(initialData);
  const [syncedInitialData, setSyncedInitialData] = useState(initialData);
  const [result, setResult] = useState<PlatformActionResult | null>(null);
  const { isProcessing, run } = useAsyncAction();

  const initialValues = useMemo(() => {
    const values: Record<string, unknown> = {};
    for (const group of panel.groups) {
      for (const field of group.fields) {
        values[field.definition.code] = field.value;
      }
    }
    return values;
  }, [panel]);

  const [values, setValues] = useState<Record<string, unknown>>(initialValues);

  if (initialData !== syncedInitialData) {
    setSyncedInitialData(initialData);
    setPanel(initialData);
    const nextValues: Record<string, unknown> = {};
    for (const group of initialData.groups) {
      for (const field of group.fields) {
        nextValues[field.definition.code] = field.value;
      }
    }
    setValues(nextValues);
  }

  async function saveAttributes(event: React.FormEvent) {
    event.preventDefault();
    setResult(null);

    await run(async () => {
      const actionResult = await saveProductAttributeValuesAction(productId, {
        values,
      });

      if (!actionResult.success) {
        setResult(platformError("Could not save", actionResult.error.message));
        return;
      }

      setPanel(actionResult.data);
      setResult(
        platformSuccess(labels.actions.attributesSaved, labels.attribute.valuesUpdatedMessage)
      );
    });
  }

  if (panel.groups.length === 0) {
    return (
      <PlatformEmptyState
        title="No attributes configured"
        description={`Assign attribute definitions to this ${offeringLower} type or its catalogue classifications, then return here to capture values.`}
        actionHref="/products/attributes"
        actionLabel={`Manage ${labels.attribute.moduleName}`}
      />
    );
  }

  return (
    <form onSubmit={saveAttributes} className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          {labels.attribute.panelHeading}
        </h2>
        <p className="text-sm text-muted-foreground">
          {labels.attribute.panelDescription}
        </p>
      </div>

      {panel.groups.map(({ group, fields }) => (
        <Card key={group.id}>
          <CardHeader>
            <CardTitle>{group.name}</CardTitle>
            <CardDescription>{group.code}</CardDescription>
          </CardHeader>
          <CardContent>
            <DynamicAttributeRenderer
              fields={fields}
              values={values}
              disabled={disabled || isProcessing}
              onChange={(code, value) =>
                setValues((current) => ({ ...current, [code]: value }))
              }
            />
          </CardContent>
        </Card>
      ))}

      {!disabled ? (
        <PlatformFormActionFooter
          result={result}
          isProcessing={isProcessing}
          processingLabel={PROCESSING_LABELS.saving}
        >
          <PlatformProcessingButton
            type="submit"
            isProcessing={isProcessing}
            processingLabel={PROCESSING_LABELS.saving}
            idleLabel="Save Attributes"
          />
          <Button
            type="button"
            variant="outline"
            disabled={isProcessing}
            onClick={() => setValues(initialValues)}
          >
            Reset
          </Button>
        </PlatformFormActionFooter>
      ) : null}
    </form>
  );
}
