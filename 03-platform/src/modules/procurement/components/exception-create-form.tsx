"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createExceptionAction } from "@/modules/procurement/actions/exception-actions";
import { EXCEPTION_OBJECT_TYPES } from "@/modules/procurement/constants";
import type { ExceptionTypeRecord } from "@/modules/procurement/types";

type ExceptionCreateFormProps = {
  types: ExceptionTypeRecord[];
};

const LINK_TYPES = [
  { value: EXCEPTION_OBJECT_TYPES.PURCHASE_ORDER, label: "Purchase order" },
  { value: EXCEPTION_OBJECT_TYPES.RECEIPT, label: "Receipt" },
  { value: EXCEPTION_OBJECT_TYPES.INVOICE, label: "Invoice" },
  { value: EXCEPTION_OBJECT_TYPES.CONTRACT, label: "Contract" },
  { value: EXCEPTION_OBJECT_TYPES.PROFILE, label: "Supplier profile" },
];

export function ExceptionCreateForm({ types }: ExceptionCreateFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [exceptionTypeCode, setExceptionTypeCode] = useState(types[0]?.code ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [objectType, setObjectType] = useState<string>(LINK_TYPES[0]!.value);
  const [objectId, setObjectId] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const result = await createExceptionAction({
        exceptionTypeCode,
        title,
        description: description || null,
        links: [{ objectType, objectId: objectId.trim() }],
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.push(`/procurement/exceptions/${result.data.id}`);
      router.refresh();
    });
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/procurement/exceptions" label="Exceptions" />
      <div>
        <h1 className="text-2xl font-semibold">Raise exception</h1>
        <p className="text-sm text-muted-foreground">
          Record a variance or control breach and link it to a procurement record.
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <section className="space-y-4 rounded-lg border p-4">
        <div className="space-y-2">
          <Label htmlFor="exceptionType">Type</Label>
          <select
            id="exceptionType"
            className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={exceptionTypeCode}
            onChange={(event) => setExceptionTypeCode(event.target.value)}
          >
            {types.map((type) => (
              <option key={type.code} value={type.code}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="objectType">Linked record type</Label>
            <select
              id="objectType"
              className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={objectType}
              onChange={(event) => setObjectType(event.target.value)}
            >
              {LINK_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="objectId">Linked record ID</Label>
            <Input
              id="objectId"
              value={objectId}
              onChange={(event) => setObjectId(event.target.value)}
            />
          </div>
        </div>
        <Button disabled={isPending || !title.trim() || !objectId.trim()} onClick={submit}>
          Raise exception
        </Button>
      </section>
    </main>
  );
}
