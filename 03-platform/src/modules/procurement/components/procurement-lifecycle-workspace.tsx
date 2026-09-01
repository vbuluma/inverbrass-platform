"use client";

import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import type { ProcurementLifecycleChainView } from "@/modules/procurement/types";

type ProcurementLifecycleWorkspaceProps = {
  data: ProcurementLifecycleChainView;
};

export function ProcurementLifecycleWorkspace({ data }: ProcurementLifecycleWorkspaceProps) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/procurement/analytics" label="Analytics" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lifecycle chain</h1>
          <p className="text-sm text-muted-foreground">
            Navigate the buying event from request through payment handoff.
          </p>
        </div>
      </div>

      {data.cycleTimeExplanation ? (
        <div className="rounded-lg border p-4 text-sm">
          <p className="font-medium">Cycle time</p>
          <p className="text-muted-foreground">
            {data.cycleTimeDays !== null ? `${data.cycleTimeDays} days — ` : ""}
            {data.cycleTimeExplanation}
          </p>
        </div>
      ) : null}

      <ol className="space-y-3">
        {data.nodes.map((node) => (
          <li key={`${node.anchorType}-${node.id}`} className="rounded-lg border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{node.label}</p>
                <p className="text-sm text-muted-foreground">{node.status}</p>
              </div>
              <Link className="text-sm text-primary underline" href={node.href}>
                Open
              </Link>
            </div>
            {node.timestamp ? (
              <p className="mt-2 text-xs text-muted-foreground">{node.timestamp.slice(0, 19)}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </main>
  );
}
