"use client";

/**
 * Campaign list dashboard.
 */

import { MegaphoneIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformKpiCard } from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCrmCampaignLabels } from "@/modules/crm/crm-terminology-labels";
import type { CampaignDashboardView } from "@/modules/crm/campaign/types";

type CampaignDashboardProps = {
  data: CampaignDashboardView;
};

export function CampaignDashboard({ data }: CampaignDashboardProps) {
  const labels = useCrmCampaignLabels();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/dashboard" label="Dashboard" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-lg bg-amber-50 text-amber-900 ring-1 ring-amber-200">
              <MegaphoneIcon className="size-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {labels.dashboardTitle}
              </h1>
              <p className="text-sm text-muted-foreground">
                {labels.dashboardDescription}
              </p>
            </div>
          </div>
          <Link
            href="/campaigns/new"
            className={cn(buttonVariants({ variant: "default" }), "gap-2")}
          >
            <PlusIcon className="size-4" aria-hidden />
            {labels.createLabel}
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformKpiCard label={labels.metrics.total} value={String(data.totalCount)} />
        <PlatformKpiCard label={labels.metrics.planned} value={String(data.plannedCount)} />
        <PlatformKpiCard label={labels.metrics.active} value={String(data.activeCount)} />
        <PlatformKpiCard
          label={labels.metrics.budget}
          value={data.totalBudget.toFixed(0)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent campaigns</CardTitle>
          <CardDescription>
            {data.recent.length === 0 ? labels.emptyTitle : "Latest campaign activity."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.recent.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.id}`}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/40"
            >
              <span>
                <span className="font-medium">{campaign.campaignNumber}</span>
                {" · "}
                {campaign.name}
              </span>
              <span className="text-muted-foreground">{campaign.statusLabel}</span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
