/**
 * Purpose:
 * Product Workspace Lifecycle tab — governed transitions, versioning, retirement.
 *
 * Implementation Package:
 * BP-003 / IP-008 – Product Lifecycle Management
 */

"use client";

import Link from "next/link";
import { useState } from "react";

import {
  PlatformEmptyState,
  useAsyncAction,
} from "@/components/platform";
import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { platformError, platformSuccess } from "@/core/platform/platform-action-helpers";
import type { PlatformActionResult } from "@/core/platform/types";
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
import {
  activateProductLifecycleAction,
  approveProductLifecycleAction,
  archiveProductLifecycleAction,
  createProductNewVersionAction,
  deprecateProductLifecycleAction,
  reactivateProductLifecycleAction,
  rejectProductLifecycleAction,
  scheduleProductLifecycleAction,
  setProductReplacementAction,
  submitProductForApprovalAction,
  suspendProductLifecycleAction,
} from "@/modules/product/actions/product-lifecycle-actions";
import {
  PRODUCT_LIFECYCLE_SCHEDULED_ACTIONS,
  PRODUCT_LIFECYCLE_STATE_CODES,
} from "@/modules/product/constants";
import type { ProductLifecyclePanelView } from "@/modules/product/types";

type ProductLifecyclePanelProps = {
  productId: string;
  initialData: ProductLifecyclePanelView;
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(value)
    );
  } catch {
    return value;
  }
}

function stateBadgeClass(state: string): string {
  switch (state) {
    case PRODUCT_LIFECYCLE_STATE_CODES.ACTIVE:
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
    case PRODUCT_LIFECYCLE_STATE_CODES.PENDING_APPROVAL:
      return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
    case PRODUCT_LIFECYCLE_STATE_CODES.SUSPENDED:
    case PRODUCT_LIFECYCLE_STATE_CODES.DEPRECATED:
      return "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200";
    case PRODUCT_LIFECYCLE_STATE_CODES.ARCHIVED:
      return "bg-muted text-muted-foreground";
    default:
      return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200";
  }
}

export function ProductLifecyclePanel({
  productId,
  initialData,
}: ProductLifecyclePanelProps) {
  const [panel, setPanel] = useState(initialData);
  const [result, setResult] = useState<PlatformActionResult | null>(null);
  const [replacementId, setReplacementId] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const { isProcessing, run } = useAsyncAction();

  async function runAction(
    action: () => Promise<AuthActionResult<ProductLifecyclePanelView>>,
    successMessage: string
  ) {
    setResult(null);
    await run(async () => {
      const response = await action();
      if (!response.success) {
        setResult(
          platformError("Action failed", response.error.message, response.error.field)
        );
        return;
      }
      setPanel(response.data);
      setResult(platformSuccess("Lifecycle updated", successMessage, response.data));
    });
  }

  const actions = panel.availableActions;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lifecycle Status</CardTitle>
          <CardDescription>
            Governed lifecycle transitions — explicit actions replace free status changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${stateBadgeClass(panel.currentState)}`}
            >
              {panel.currentState.replace(/_/g, " ")}
            </span>
            <span className="text-sm text-muted-foreground">
              Version {panel.versionNumber}
            </span>
            {panel.approvalStatus && (
              <span className="text-sm text-muted-foreground">
                Approval: {panel.approvalStatus.replace(/_/g, " ")}
              </span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Effective From</p>
              <p className="font-medium">{formatDate(panel.effectiveFrom)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Effective To</p>
              <p className="font-medium">{formatDate(panel.effectiveTo)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Replacement</p>
              <p className="font-medium">
                {panel.replacementProductName ? (
                  <Link
                    href={`/products/${panel.replacementProductId}`}
                    className="text-primary hover:underline"
                  >
                    {panel.replacementProductCode} — {panel.replacementProductName}
                  </Link>
                ) : (
                  "None"
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Scheduled</p>
              <p className="font-medium">
                {panel.scheduledAction
                  ? `${panel.scheduledAction} on ${formatDate(panel.scheduledAt)}`
                  : "—"}
              </p>
            </div>
          </div>

          {!panel.isReadOnly && (
            <div className="flex flex-wrap gap-2 pt-2">
              {actions.includes("SUBMIT_FOR_APPROVAL") && (
                <Button
                  disabled={isProcessing}
                  onClick={() =>
                    runAction(
                      () => submitProductForApprovalAction(productId),
                      "Submitted for approval."
                    )
                  }
                >
                  Submit for Approval
                </Button>
              )}
              {actions.includes("APPROVE") && (
                <Button
                  disabled={isProcessing}
                  onClick={() =>
                    runAction(
                      () => approveProductLifecycleAction(productId),
                      "Product approved."
                    )
                  }
                >
                  Approve
                </Button>
              )}
              {actions.includes("REJECT") && (
                <Button
                  variant="outline"
                  disabled={isProcessing}
                  onClick={() =>
                    runAction(
                      () => rejectProductLifecycleAction(productId),
                      "Approval rejected."
                    )
                  }
                >
                  Reject
                </Button>
              )}
              {actions.includes("ACTIVATE") && (
                <Button
                  disabled={isProcessing}
                  onClick={() =>
                    runAction(
                      () => activateProductLifecycleAction(productId),
                      "Product activated."
                    )
                  }
                >
                  Activate
                </Button>
              )}
              {actions.includes("SUSPEND") && (
                <Button
                  variant="outline"
                  disabled={isProcessing}
                  onClick={() =>
                    runAction(
                      () => suspendProductLifecycleAction(productId),
                      "Product suspended."
                    )
                  }
                >
                  Suspend
                </Button>
              )}
              {actions.includes("REACTIVATE") && (
                <Button
                  disabled={isProcessing}
                  onClick={() =>
                    runAction(
                      () => reactivateProductLifecycleAction(productId),
                      "Product reactivated."
                    )
                  }
                >
                  Reactivate
                </Button>
              )}
              {actions.includes("DEPRECATE") && (
                <Button
                  variant="outline"
                  disabled={isProcessing}
                  onClick={() =>
                    runAction(
                      () => deprecateProductLifecycleAction(productId),
                      "Product deprecated."
                    )
                  }
                >
                  Deprecate
                </Button>
              )}
              {actions.includes("ARCHIVE") && (
                <Button
                  variant="destructive"
                  disabled={isProcessing}
                  onClick={() =>
                    runAction(
                      () => archiveProductLifecycleAction(productId),
                      "Product archived."
                    )
                  }
                >
                  Archive
                </Button>
              )}
              {actions.includes("CREATE_NEW_VERSION") && (
                <>
                  <Button
                    variant="outline"
                    disabled={isProcessing}
                    onClick={() =>
                      runAction(
                        () => createProductNewVersionAction(productId, false),
                        "Minor version created."
                      )
                    }
                  >
                    New Minor Version
                  </Button>
                  <Button
                    variant="outline"
                    disabled={isProcessing}
                    onClick={() =>
                      runAction(
                        () => createProductNewVersionAction(productId, true),
                        "Major version created."
                      )
                    }
                  >
                    New Major Version
                  </Button>
                </>
              )}
            </div>
          )}

          {actions.includes("REPLACE") && !panel.isReadOnly && (
            <div className="flex flex-wrap items-end gap-2 border-t pt-4">
              <div className="space-y-1">
                <Label htmlFor="replacement-id">Replacement Product ID</Label>
                <Input
                  id="replacement-id"
                  value={replacementId}
                  onChange={(e) => setReplacementId(e.target.value)}
                  placeholder="UUID of replacement product"
                />
              </div>
              <Button
                disabled={isProcessing || !replacementId.trim()}
                onClick={() =>
                  runAction(
                    () =>
                      setProductReplacementAction(productId, {
                        replacementProductId: replacementId.trim(),
                      }),
                    "Replacement assigned."
                  )
                }
              >
                Assign Replacement
              </Button>
            </div>
          )}

          {!panel.isReadOnly && (
            <div className="flex flex-wrap items-end gap-2 border-t pt-4">
              <div className="space-y-1">
                <Label htmlFor="schedule-date">Schedule Activation</Label>
                <Input
                  id="schedule-date"
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              </div>
              <Button
                disabled={isProcessing || !scheduleDate}
                onClick={() =>
                  runAction(
                    () =>
                      scheduleProductLifecycleAction(productId, {
                        scheduledAction: PRODUCT_LIFECYCLE_SCHEDULED_ACTIONS.ACTIVATE,
                        scheduledAt: scheduleDate,
                      }),
                    "Activation scheduled."
                  )
                }
              >
                Schedule Activation
              </Button>
            </div>
          )}

          {result && (
            <p
              className={`text-sm ${result.success ? "text-emerald-600" : "text-destructive"}`}
            >
              {result.message}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lifecycle History</CardTitle>
          <CardDescription>Append-only lifecycle event log.</CardDescription>
        </CardHeader>
        <CardContent>
          {panel.events.length === 0 ? (
            <PlatformEmptyState
              title="No lifecycle events"
              description="Lifecycle events will appear here as actions are performed."
            />
          ) : (
            <ul className="space-y-3">
              {panel.events.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium">{event.eventType.replace(/_/g, " ")}</p>
                    {event.reason && (
                      <p className="text-sm text-muted-foreground">{event.reason}</p>
                    )}
                    {(event.oldState || event.newState) && (
                      <p className="text-xs text-muted-foreground">
                        {event.oldState ?? "—"} → {event.newState ?? "—"}
                      </p>
                    )}
                  </div>
                  <time className="text-xs text-muted-foreground">
                    {formatDate(event.performedAt.slice(0, 10))}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
