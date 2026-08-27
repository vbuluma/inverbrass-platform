"use client";

/**
 * Campaign workspace — overview, members, ROI, lifecycle actions.
 */

import Link from "next/link";
import { useState } from "react";

import { SetBreadcrumbs } from "@/components/platform/breadcrumb-context";
import {
  PlatformFormActionFooter,
  PlatformProcessingButton,
  PlatformTabs,
  PlatformWorkspaceHeader,
  PROCESSING_LABELS,
  useAsyncAction,
} from "@/components/platform";
import { platformError, platformSuccess } from "@/core/platform/platform-action-helpers";
import type { PlatformActionResult } from "@/core/platform/types";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  activateCampaignAction,
  cancelCampaignAction,
  completeCampaignAction,
  markCampaignMemberConvertedAction,
  markCampaignMemberSentAction,
  recordCampaignMemberResponseAction,
  syncCampaignAudienceAction,
} from "@/modules/crm/actions/campaign-actions";
import { CAMPAIGN_STATUS_CODES } from "@/modules/crm/constants";
import { useCrmCampaignLabels } from "@/modules/crm/crm-terminology-labels";
import type { CampaignDetailView } from "@/modules/crm/campaign/types";

type CampaignWorkspaceProps = {
  initialData: CampaignDetailView;
  initialTab?: string;
};

export function CampaignWorkspace({
  initialData,
  initialTab = "overview",
}: CampaignWorkspaceProps) {
  const labels = useCrmCampaignLabels();
  const [campaign, setCampaign] = useState(initialData);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [actionResult, setActionResult] = useState<PlatformActionResult | null>(null);
  const { isProcessing, run } = useAsyncAction();

  const isPlanned = campaign.status === CAMPAIGN_STATUS_CODES.PLANNED;
  const isActive = campaign.status === CAMPAIGN_STATUS_CODES.ACTIVE;

  async function runLifecycle(
    action: () => Promise<{
      success: boolean;
      data?: CampaignDetailView;
      error?: { message: string };
    }>,
    successMessage: string
  ) {
    setActionResult(null);
    await run(async () => {
      const result = await action();
      if (!result.success || !result.data) {
        setActionResult(
          platformError("Action failed", result.error?.message ?? "Unknown error")
        );
        return;
      }
      setCampaign(result.data);
      setActionResult(platformSuccess(successMessage, successMessage));
    });
  }

  return (
    <>
      <SetBreadcrumbs
        items={[
          { label: labels.moduleName, href: "/campaigns" },
          { label: campaign.campaignNumber },
        ]}
      />

      <PlatformWorkspaceHeader
        backHref="/campaigns"
        backLabel={labels.backLabel}
        workspaceLabel={labels.moduleName}
        title={campaign.name}
        subtitle={campaign.campaignNumber}
        statusLabel={campaign.statusLabel}
      />

      <PlatformTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        ariaLabel="Campaign workspace sections"
        tabs={[
          { id: "overview", label: labels.tabs.overview },
          { id: "members", label: labels.tabs.members },
          { id: "roi", label: labels.tabs.roi },
        ]}
      />

      {actionResult ? (
        <p
          className={
            actionResult.success ? "text-sm text-emerald-700" : "text-sm text-destructive"
          }
        >
          {actionResult.message}
        </p>
      ) : null}

      {activeTab === "overview" ? (
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Campaign header and lifecycle actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Type</dt>
                <dd>{campaign.campaignTypeLabel}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Members</dt>
                <dd>{campaign.memberCount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Budget</dt>
                <dd>
                  {campaign.budgetAmount.toFixed(2)} {campaign.currencyCode}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Party group</dt>
                <dd>{campaign.partyGroupId ?? "—"}</dd>
              </div>
            </dl>

            <PlatformFormActionFooter className="flex flex-wrap gap-2">
              {isPlanned ? (
                <PlatformProcessingButton
                  isProcessing={isProcessing}
                  processingLabel={PROCESSING_LABELS.saving}
                  idleLabel={labels.actions.activate}
                  onClick={() =>
                    runLifecycle(
                      () => activateCampaignAction(campaign.id),
                      "Campaign activated."
                    )
                  }
                />
              ) : null}
              {isActive ? (
                <PlatformProcessingButton
                  isProcessing={isProcessing}
                  processingLabel={PROCESSING_LABELS.saving}
                  idleLabel={labels.actions.complete}
                  onClick={() =>
                    runLifecycle(
                      () => completeCampaignAction(campaign.id),
                      "Campaign completed."
                    )
                  }
                />
              ) : null}
              {isPlanned || isActive ? (
                <>
                  <PlatformProcessingButton
                    isProcessing={isProcessing}
                    processingLabel={PROCESSING_LABELS.saving}
                    idleLabel={labels.actions.syncAudience}
                    onClick={() =>
                      runLifecycle(
                        () => syncCampaignAudienceAction(campaign.id),
                        "Audience synced."
                      )
                    }
                  />
                  <PlatformProcessingButton
                    isProcessing={isProcessing}
                    processingLabel={PROCESSING_LABELS.saving}
                    idleLabel={labels.actions.cancel}
                    onClick={() =>
                      runLifecycle(
                        () => cancelCampaignAction(campaign.id),
                        "Campaign cancelled."
                      )
                    }
                  />
                </>
              ) : null}
            </PlatformFormActionFooter>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "members" ? (
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4">Party</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaign.members.map((member) => (
                  <tr key={member.id} className="border-b">
                    <td className="py-2 pr-4">
                      {member.partyDisplayName ?? member.partyId}
                    </td>
                    <td className="py-2 pr-4">{member.memberStatusLabel}</td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <PlatformProcessingButton
                          isProcessing={isProcessing}
                          processingLabel={PROCESSING_LABELS.saving}
                          idleLabel={labels.actions.markSent}
                          onClick={() =>
                            runLifecycle(
                              () =>
                                markCampaignMemberSentAction(campaign.id, member.id),
                              "Member marked sent."
                            )
                          }
                        />
                        <PlatformProcessingButton
                          isProcessing={isProcessing}
                          processingLabel={PROCESSING_LABELS.saving}
                          idleLabel={labels.actions.recordResponse}
                          onClick={() =>
                            runLifecycle(
                              () =>
                                recordCampaignMemberResponseAction(
                                  campaign.id,
                                  member.id
                                ),
                              "Response recorded."
                            )
                          }
                        />
                        <PlatformProcessingButton
                          isProcessing={isProcessing}
                          processingLabel={PROCESSING_LABELS.saving}
                          idleLabel={labels.actions.markConverted}
                          onClick={() =>
                            runLifecycle(
                              () =>
                                markCampaignMemberConvertedAction(
                                  campaign.id,
                                  member.id
                                ),
                              "Member converted."
                            )
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "roi" ? (
        <Card>
          <CardHeader>
            <CardTitle>ROI summary</CardTitle>
            <CardDescription>
              Pipeline value attribution deferred until IP-03 opportunity amounts merge.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Members</dt>
                <dd>{campaign.roi.memberCount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Response rate</dt>
                <dd>{campaign.roi.responseRate}%</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Conversion rate</dt>
                <dd>{campaign.roi.conversionRate}%</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Cost variance</dt>
                <dd>
                  {campaign.roi.costVariance.toFixed(2)} {campaign.currencyCode}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Attributed pipeline</dt>
                <dd>{campaign.roi.attributedPipelineValue.toFixed(2)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      ) : null}

      <div className="pt-2">
        <Link href="/campaigns" className={cn(buttonVariants({ variant: "outline" }))}>
          {labels.backLabel}
        </Link>
      </div>
    </>
  );
}
