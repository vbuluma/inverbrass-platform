"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformSearchState } from "@/components/platform";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createProcurementProfileAction,
  searchProcurementPartiesAction,
} from "@/modules/procurement/actions/procurement-actions";
import type {
  ProcurementCataloguesView,
  ProcurementPartyRef,
} from "@/modules/procurement/types";

type AddSupplierFormProps = {
  catalogues: ProcurementCataloguesView;
};

export function AddSupplierForm({ catalogues }: AddSupplierFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProcurementPartyRef[]>([]);
  const [selected, setSelected] = useState<ProcurementPartyRef | null>(null);
  const [assignSupplierRole, setAssignSupplierRole] = useState(true);
  const [categoryCodes, setCategoryCodes] = useState<string[]>([]);
  const [capabilityCodes, setCapabilityCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<"idle" | "searching" | "empty" | "success">(
    "idle"
  );
  const [isPending, startTransition] = useTransition();

  function toggle(list: string[], value: string) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  function search(nextQuery: string) {
    setQuery(nextQuery);
    if (nextQuery.trim().length < 2) {
      setResults([]);
      setSearchStatus("idle");
      return;
    }
    setSearchStatus("searching");
    startTransition(async () => {
      const result = await searchProcurementPartiesAction(nextQuery);
      if (!result.success) {
        setError(result.error.message);
        setSearchStatus("empty");
        return;
      }
      setError(null);
      setResults(result.data);
      setSearchStatus(result.data.length === 0 ? "empty" : "success");
    });
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selected) {
      setError("Select an existing party first.");
      return;
    }
    startTransition(async () => {
      const result = await createProcurementProfileAction({
        partyId: selected.id,
        assignSupplierRole: selected.hasActiveSupplierRole ? false : assignSupplierRole,
        categoryCodes,
        capabilityCodes,
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.push(`/procurement/suppliers/${result.data.id}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/procurement/suppliers" label="Suppliers" />
        <h1 className="text-2xl font-semibold">Add supplier</h1>
        <p className="text-sm text-muted-foreground">
          Link an existing party. Name, address, and contacts stay on the party record.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="party-search">Find existing party</Label>
          <Input
            id="party-search"
            value={query}
            onChange={(event) => search(event.target.value)}
            placeholder="Search by name or party number"
          />
          <p className="text-xs text-muted-foreground">
            Need a new party?{" "}
            <Link href="/parties/new" className="underline">
              Register party
            </Link>{" "}
            then return here.
          </p>
        </div>

        <PlatformSearchState
          status={searchStatus === "idle" ? "idle" : searchStatus}
          emptyTitle="No matching parties"
          emptyHints={["A different name", "Register a new party first"]}
          compact
        >
          <ul className="divide-y rounded-lg border">
            {results.map((party) => (
              <li key={party.id}>
                <button
                  type="button"
                  className={`block w-full px-4 py-3 text-left ${
                    selected?.id === party.id ? "bg-muted/60" : "hover:bg-muted/40"
                  }`}
                  onClick={() => setSelected(party)}
                >
                  <p className="font-medium">{party.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {party.partyNumber}
                    {party.hasActiveSupplierRole ? " · Supplier role" : " · No supplier role yet"}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </PlatformSearchState>

        {selected && !selected.hasActiveSupplierRole ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={assignSupplierRole}
              onChange={(event) => setAssignSupplierRole(event.target.checked)}
            />
            Confirm supplier role on this party
          </label>
        ) : null}

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Categories</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {catalogues.categories.map((row) => (
              <label key={row.code} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={categoryCodes.includes(row.code)}
                  onChange={() => setCategoryCodes(toggle(categoryCodes, row.code))}
                />
                {row.name}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Capabilities</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {catalogues.capabilities.map((row) => (
              <label key={row.code} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={capabilityCodes.includes(row.code)}
                  onChange={() => setCapabilityCodes(toggle(capabilityCodes, row.code))}
                />
                {row.name}
              </label>
            ))}
          </div>
        </fieldset>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="submit" disabled={isPending || !selected}>
          {isPending ? "Saving…" : "Create procurement profile"}
        </Button>
      </form>
    </main>
  );
}
