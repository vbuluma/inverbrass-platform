"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createContractAction } from "@/modules/procurement/actions/contract-actions";

export function ContractCreateForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [profileId, setProfileId] = useState("");
  const [totalValue, setTotalValue] = useState("");
  const [contractTypeCode, setContractTypeCode] = useState("FRAMEWORK_AGREEMENT");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/procurement/contracts" label="Contracts" />
      <div>
        <h1 className="text-2xl font-semibold">Register contract</h1>
        <p className="text-sm text-muted-foreground">
          Capture contract metadata. Attach the executed document after approval.
        </p>
      </div>
      <form
        className="space-y-4"
        onSubmit={(formEvent) => {
          formEvent.preventDefault();
          startTransition(async () => {
            const result = await createContractAction({
              profileId,
              contractTypeCode,
              title,
              currencyCode: "KES",
              valueType: "FIXED",
              totalValue,
            });
            if (!result.success) {
              setError(result.error.message);
              return;
            }
            router.push(`/procurement/contracts/${result.data.id}`);
          });
        }}
      >
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profileId">Supplier profile ID</Label>
          <Input
            id="profileId"
            value={profileId}
            onChange={(event) => setProfileId(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contractTypeCode">Contract type</Label>
          <select
            id="contractTypeCode"
            value={contractTypeCode}
            onChange={(event) => setContractTypeCode(event.target.value)}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="FRAMEWORK_AGREEMENT">Framework agreement</option>
            <option value="SUPPLY_AGREEMENT">Supply agreement</option>
            <option value="SERVICE_CONTRACT">Service contract</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="totalValue">Total contract value</Label>
          <Input
            id="totalValue"
            value={totalValue}
            onChange={(event) => setTotalValue(event.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Create contract"}
        </Button>
      </form>
    </main>
  );
}
