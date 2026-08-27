/**
 * Purpose:
 * Register a new attribute definition.
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import {
  PlatformFormActionFooter,
  PlatformProcessingButton,
  PROCESSING_LABELS,
  useAsyncAction,
} from "@/components/platform";
import { platformError } from "@/core/platform/platform-action-helpers";
import type { PlatformActionResult } from "@/core/platform/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useControlledForm } from "@/lib/forms";
import { createAttributeDefinitionAction } from "@/modules/product/actions/attribute-actions";
import { useProductUiLabels } from "@/modules/product/product-terminology-labels";
import { ATTRIBUTE_DATA_TYPES } from "@/modules/product/constants";
import type { AttributeDashboardView } from "@/modules/product/types";

type AttributeDefinitionRegistrationFormProps = {
  dashboard: AttributeDashboardView;
};

export function AttributeDefinitionRegistrationForm({
  dashboard,
}: AttributeDefinitionRegistrationFormProps) {
  const labels = useProductUiLabels();
  const router = useRouter();
  const [result, setResult] = useState<PlatformActionResult | null>(null);
  const { isProcessing, run } = useAsyncAction();

  const form = useControlledForm({
    initial: {
      attributeGroupId: dashboard.groups[0]?.id ?? "",
      code: "",
      name: "",
      description: "",
      dataType: ATTRIBUTE_DATA_TYPES.TEXT as string,
      isMandatory: false as boolean,
      isReadOnly: false as boolean,
      isHidden: false as boolean,
    },
    draftHydrated: true,
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setResult(null);

    await run(async () => {
      const actionResult = await createAttributeDefinitionAction({
        attributeGroupId: form.textValue("attributeGroupId"),
        code: form.textValue("code"),
        name: form.textValue("name"),
        description: form.textValue("description") || undefined,
        dataType: form.textValue("dataType"),
        isMandatory: form.checkedValue("isMandatory"),
        isReadOnly: form.checkedValue("isReadOnly"),
        isHidden: form.checkedValue("isHidden"),
      });

      if (!actionResult.success) {
        setResult(
          platformError("Could not create attribute", actionResult.error.message)
        );
        return;
      }

      router.push(
        `/products/attributes/definitions/${actionResult.data.id}`
      );
    });
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <PageBackLink href="/products/attributes" label={labels.attribute.backToModule} />
      <div className="mt-4 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {labels.attribute.definitionRegistrationTitle}
        </h1>
        <p className="text-sm text-muted-foreground">
          {labels.attribute.definitionRegistrationDescription}
        </p>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="attributeGroupId">Attribute Group</Label>
          <select
            id="attributeGroupId"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.textValue("attributeGroupId")}
            onChange={(event) => form.setField("attributeGroupId", event.target.value)}
            required
          >
            <option value="">Select group…</option>
            {dashboard.groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            value={form.textValue("code")}
            onChange={(event) => form.setField("code", event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={form.textValue("name")}
            onChange={(event) => form.setField("name", event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dataType">Data Type</Label>
          <select
            id="dataType"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.textValue("dataType")}
            onChange={(event) => form.setField("dataType", event.target.value)}
          >
            {dashboard.dataTypes.map((type) => (
              <option key={type.code} value={type.code}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.checkedValue("isMandatory")}
              onChange={(event) => form.setField("isMandatory", event.target.checked)}
            />
            Mandatory
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.checkedValue("isReadOnly")}
              onChange={(event) => form.setField("isReadOnly", event.target.checked)}
            />
            Read-only
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.checkedValue("isHidden")}
              onChange={(event) => form.setField("isHidden", event.target.checked)}
            />
            Hidden
          </label>
        </div>

        <PlatformFormActionFooter
          result={result}
          isProcessing={isProcessing}
          processingLabel={PROCESSING_LABELS.saving}
        >
          <PlatformProcessingButton
            type="submit"
            isProcessing={isProcessing}
            processingLabel={PROCESSING_LABELS.saving}
            idleLabel="Create Attribute"
          />
          <Link href="/products/attributes" className="text-sm text-muted-foreground">
            Cancel
          </Link>
        </PlatformFormActionFooter>
      </form>
    </main>
  );
}
