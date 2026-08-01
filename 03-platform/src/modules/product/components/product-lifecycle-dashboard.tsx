/**
 * Purpose:
 * Lifecycle Dashboard — KPIs and recently changed products.
 *
 * Implementation Package:
 * BP-003 / IP-008 – Product Lifecycle Management
 */

"use client";

import Link from "next/link";

import { SetBreadcrumbs } from "@/components/platform/breadcrumb-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PRODUCT_LIFECYCLE_STATE_CODES } from "@/modules/product/constants";
import type { ProductLifecycleDashboardView } from "@/modules/product/types";

type ProductLifecycleDashboardProps = {
  data: ProductLifecycleDashboardView;
};

const STATE_LABELS: Record<string, string> = {
  [PRODUCT_LIFECYCLE_STATE_CODES.DRAFT]: "Draft",
  [PRODUCT_LIFECYCLE_STATE_CODES.PENDING_APPROVAL]: "Pending Approval",
  [PRODUCT_LIFECYCLE_STATE_CODES.APPROVED]: "Approved",
  [PRODUCT_LIFECYCLE_STATE_CODES.ACTIVE]: "Active",
  [PRODUCT_LIFECYCLE_STATE_CODES.SUSPENDED]: "Suspended",
  [PRODUCT_LIFECYCLE_STATE_CODES.DEPRECATED]: "Deprecated",
  [PRODUCT_LIFECYCLE_STATE_CODES.DISCONTINUED]: "Discontinued",
  [PRODUCT_LIFECYCLE_STATE_CODES.ARCHIVED]: "Archived",
};

export function ProductLifecycleDashboard({
  data,
}: ProductLifecycleDashboardProps) {
  return (
    <>
      <SetBreadcrumbs
        items={[
          { label: "Products", href: "/products" },
          { label: "Lifecycle Dashboard" },
        ]}
      />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Lifecycle Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Operational view of product lifecycle states across the catalogue.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.kpis.map((kpi) => (
          <Card key={kpi.state}>
            <CardHeader className="pb-2">
              <CardDescription>
                {STATE_LABELS[kpi.state] ?? kpi.state}
              </CardDescription>
              <CardTitle className="text-3xl">{kpi.count}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recently Changed</CardTitle>
          <CardDescription>
            Products with recent lifecycle activity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentlyChanged.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No lifecycle records yet.
            </p>
          ) : (
            <ul className="divide-y">
              {data.recentlyChanged.map((item) => (
                <li
                  key={`${item.productId}-${item.updatedAt}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div>
                    <Link
                      href={`/products/${item.productId}?tab=lifecycle`}
                      className="font-medium text-primary hover:underline"
                    >
                      {item.productCode} — {item.productName}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {STATE_LABELS[item.currentState] ?? item.currentState} · v
                      {item.versionNumber}
                    </p>
                  </div>
                  <time className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(item.updatedAt))}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
