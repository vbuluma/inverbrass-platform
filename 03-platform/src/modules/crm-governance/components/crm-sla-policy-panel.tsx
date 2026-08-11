/**
 * SLA policy administration section (dashboard embed).
 */

"use client";

import { useState, useTransition } from "react";

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
import { upsertCrmSlaPolicyAction } from "@/modules/crm-governance/actions/crm-governance-actions";
import { CRM_SLA_ENTITY_TYPE_CODES } from "@/modules/crm-governance/constants";
import type { CrmSlaPolicyView } from "@/modules/crm-governance/types";

type Props = {
  initialPolicies: CrmSlaPolicyView[];
  onChanged?: () => void;
};

export function CrmSlaPolicyPanel({ initialPolicies, onChanged }: Props) {
  const [policies, setPolicies] = useState(initialPolicies);
  const [name, setName] = useState("");
  const [entityTypeCode, setEntityTypeCode] = useState<string>(
    CRM_SLA_ENTITY_TYPE_CODES.APPOINTMENT
  );
  const [resolutionHours, setResolutionHours] = useState("24");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onAdd() {
    startTransition(async () => {
      const result = await upsertCrmSlaPolicyAction({
        entityTypeCode,
        name: name.trim() || `${entityTypeCode} policy`,
        resolutionTargetHours: Number(resolutionHours) || 24,
        escalationEnabled: false,
        isActive: true,
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setError(null);
      setName("");
      setPolicies((prev) => [...prev, result.data]);
      onChanged?.();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>SLA policies</CardTitle>
        <CardDescription>
          ENG-003n stub — CASE / VISIT_REPORT / ACTIVITY / APPOINTMENT.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <ul className="space-y-2 text-sm">
          {policies.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap justify-between gap-2 rounded-md border px-3 py-2"
            >
              <span className="font-medium">{row.name}</span>
              <span className="text-muted-foreground">
                {row.entityTypeCode}
                {row.priorityCode ? ` / ${row.priorityCode}` : ""} · FR{" "}
                {row.firstResponseTargetHours ?? "—"}h · Res{" "}
                {row.resolutionTargetHours}h
              </span>
            </li>
          ))}
        </ul>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="sla-entity">Entity type</Label>
            <select
              id="sla-entity"
              className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={entityTypeCode}
              onChange={(e) => setEntityTypeCode(e.target.value)}
            >
              {Object.values(CRM_SLA_ENTITY_TYPE_CODES).map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="sla-name">Name</Label>
            <Input
              id="sla-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Policy name"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sla-hours">Resolution hours</Label>
            <Input
              id="sla-hours"
              type="number"
              min={1}
              value={resolutionHours}
              onChange={(e) => setResolutionHours(e.target.value)}
            />
          </div>
        </div>
        <Button size="sm" disabled={isPending} onClick={onAdd}>
          Add SLA policy
        </Button>
      </CardContent>
    </Card>
  );
}
