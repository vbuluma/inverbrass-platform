/**
 * Purpose:
 * Register a new attribute group.
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
import { createAttributeGroupAction } from "@/modules/product/actions/attribute-actions";
import { useProductUiLabels } from "@/modules/product/product-terminology-labels";

export function AttributeGroupRegistrationForm() {
  const labels = useProductUiLabels();
  const router = useRouter();
  const [result, setResult] = useState<PlatformActionResult | null>(null);
  const { isProcessing, run } = useAsyncAction();

  const form = useControlledForm({
    initial: {
      code: "",
      name: "",
      description: "",
    },
    draftHydrated: true,
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setResult(null);

    await run(async () => {
      const actionResult = await createAttributeGroupAction({
        code: form.textValue("code"),
        name: form.textValue("name"),
        description: form.textValue("description") || undefined,
      });

      if (!actionResult.success) {
        setResult(platformError("Could not create group", actionResult.error.message));
        return;
      }

      router.push(`/products/attributes/groups/${actionResult.data.id}`);
    });
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <PageBackLink href="/products/attributes" label={labels.attribute.backToModule} />
      <div className="mt-4 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {labels.attribute.groupRegistrationTitle}
        </h1>
        <p className="text-sm text-muted-foreground">
          {labels.attribute.groupRegistrationDescription}
        </p>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
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
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={form.textValue("description")}
            onChange={(event) => form.setField("description", event.target.value)}
          />
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
            idleLabel="Create Group"
          />
          <Link href="/products/attributes" className="text-sm text-muted-foreground">
            Cancel
          </Link>
        </PlatformFormActionFooter>
      </form>
    </main>
  );
}
