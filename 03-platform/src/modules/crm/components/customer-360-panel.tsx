/**
 * Purpose:
 * Customer 360 composition UI — renders metadata-driven widget zones.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

"use client";

import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Customer360TimelineSection } from "@/modules/crm/components/customer-360-timeline-section";
import { useCrmDashboardLabels } from "@/modules/crm/crm-terminology-labels";
import type {
  Customer360CompositionView,
  Customer360WidgetSlotView,
} from "@/modules/crm/types";
import type { PartyTimelinePanelView } from "@/modules/party/types";

type Customer360PanelProps = {
  data: Customer360CompositionView;
  partyId: string;
  timelinePanel: PartyTimelinePanelView;
};

function widgetToneClass(
  status: Customer360WidgetSlotView["summary"]["status"]
): string {
  switch (status) {
    case "danger":
      return "border-red-200 bg-red-50";
    case "warning":
      return "border-amber-200 bg-amber-50";
    case "success":
      return "border-emerald-200 bg-emerald-50";
    default:
      return "border-border bg-background";
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`;
  }
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h`;
  }
  return `${Math.floor(seconds / 86400)}d`;
}

function WidgetSlot({ slot }: { slot: Customer360WidgetSlotView }) {
  const { summary, config, state } = slot;

  return (
    <div
      className={`rounded-lg border p-3 ${widgetToneClass(summary.status)} ${
        state === "placeholder" ? "border-dashed opacity-90" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {summary.title}
        </div>
        <span className="text-[10px] text-muted-foreground">{config.sourceIp}</span>
      </div>
      <div className="mt-1 text-lg font-semibold">{summary.value}</div>
      {summary.hint ? (
        <div className="mt-1 text-xs text-muted-foreground">{summary.hint}</div>
      ) : null}
      {state === "placeholder" ? (
        <div className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
          Extension point · {config.ownerModule}
        </div>
      ) : null}
    </div>
  );
}

export function Customer360Panel({
  data,
  partyId,
  timelinePanel,
}: Customer360PanelProps) {
  const labels = useCrmDashboardLabels();
  const groupedRelationships = data.relationships.relationships.reduce<
    Record<string, typeof data.relationships.relationships>
  >((acc, relationship) => {
    const key = relationship.relationshipTypeName;
    acc[key] = acc[key] ?? [];
    acc[key].push(relationship);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
            <CardDescription>
              Read from Party master — CRM adds relationship context only.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <IdentityField label="Customer" value={data.identity.displayName} />
            <IdentityField label="Customer number" value={data.identity.customerNumber} />
            <IdentityField label="Party type" value={data.identity.partyTypeName} />
            <IdentityField label="CRM type" value={data.identity.crmTypeName} />
            <IdentityField label="Status" value={data.identity.statusName} />
            <IdentityField label="Owner" value={data.identity.ownerDisplayName ?? "—"} />
            <IdentityField
              label="Relationship manager"
              value={data.identity.relationshipManagerDisplayName ?? "—"}
            />
            <IdentityField label="Branch" value={data.identity.branchName ?? "—"} />
            <IdentityField label="Source" value={data.identity.sourceName ?? "—"} />
            <IdentityField
              label="Preferred channel"
              value={data.identity.preferredChannel ?? "—"}
            />
            <IdentityField
              label="Customer since"
              value={new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
              }).format(new Date(data.identity.customerSince))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment & SLA</CardTitle>
            <CardDescription>ENG-003n consumption contract</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {data.assignmentSummary ? (
              <>
                <SummaryRow
                  label="Current owner"
                  value={data.assignmentSummary.ownerDisplayName ?? "Assigned"}
                />
                <SummaryRow
                  label="Segment elapsed"
                  value={formatDuration(
                    data.assignmentSummary.currentSegmentElapsedSeconds
                  )}
                />
                <SummaryRow
                  label="Total elapsed"
                  value={formatDuration(data.assignmentSummary.totalElapsedSeconds)}
                />
                <SummaryRow
                  label="SLA status"
                  value={
                    data.assignmentSummary.isBreached ? "Breached" : "Within target"
                  }
                />
              </>
            ) : (
              <p className="text-muted-foreground">No owner assignment recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Relationship network</CardTitle>
          <CardDescription>
            {data.layoutProfile === "individual"
              ? "Individual profile — linked companies, guarantors, and related parties."
              : "Entity profile — directors, shareholders, subsidiaries, and related parties."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.keys(groupedRelationships).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No relationships recorded for this party yet.
            </p>
          ) : (
            Object.entries(groupedRelationships).map(([typeName, relationships]) => (
              <div key={typeName} className="space-y-2">
                <h3 className="text-sm font-medium">{typeName}</h3>
                <div className="space-y-2">
                  {relationships.map((relationship) => (
                    <div
                      key={relationship.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                    >
                      <div>
                        <div className="font-medium">
                          {relationship.relatedPartyName}
                        </div>
                        <div className="text-muted-foreground">
                          {relationship.relatedPartyNumber}
                        </div>
                      </div>
                      <Link
                        href={`/parties/${relationship.relatedPartyId}`}
                        className="text-primary hover:underline"
                      >
                        Open party
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {data.zones.map((zone) => (
        <Card key={zone.zone}>
          <CardHeader>
            <CardTitle>{zone.label}</CardTitle>
            <CardDescription>
              Metadata-driven composition layer — widgets enabled by configuration;
              loaders contributed by owning IPs.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {zone.slots.length === 0 ? (
              <p className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
                No widgets enabled for this zone.
              </p>
            ) : (
              zone.slots.map((slot) => <WidgetSlot key={slot.config.id} slot={slot} />)
            )}
          </CardContent>
        </Card>
      ))}

      <Customer360TimelineSection
        partyId={partyId}
        timelinePanel={timelinePanel}
        previewEvents={data.partyTimeline.events}
        sourceLabel={data.partyTimelineSource}
        title={`${labels.customer360Title} timeline`}
      />
    </div>
  );
}

function IdentityField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
