/**
 * Purpose:
 * Present the BP-001 operational Business Dashboard for an ACTIVE business.
 *
 * Design rationale:
 * Platform Home answers "Where do I manage my businesses?"
 * Business Dashboard answers "Where do I run this business?"
 *
 * Why this exists:
 * UX refinement — personalized header, health, KPIs, and clickable module cards.
 */

"use client";

import {
  ActivityIcon,
  ArrowLeftRightIcon,
  BadgeCheckIcon,
  BellIcon,
  Building2Icon,
  CircleDollarSignIcon,
  ClipboardListIcon,
  FactoryIcon,
  Globe2Icon,
  HomeIcon,
  LayoutDashboardIcon,
  PackageIcon,
  ReceiptIcon,
  Settings2Icon,
  ShoppingBagIcon,
  UsersIcon,
  WalletCardsIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BusinessDashboardView } from "@/modules/business/onboarding/types";
import { cn } from "@/lib/utils";

type BusinessDashboardProps = {
  data: BusinessDashboardView;
};

type FutureModule = {
  id: string;
  title: string;
  description: string;
  icon: typeof PackageIcon;
};

const FUTURE_MODULES: FutureModule[] = [
  {
    id: "products",
    title: "Products & Services",
    description: "Catalogue items your business sells.",
    icon: PackageIcon,
  },
  {
    id: "customers",
    title: "Customers",
    description: "Customer records and relationships.",
    icon: UsersIcon,
  },
  {
    id: "sales",
    title: "Sales & Checkout",
    description: "Record sales and take payments.",
    icon: ShoppingBagIcon,
  },
  {
    id: "reports",
    title: "Reports",
    description: "Performance and operational reports.",
    icon: ClipboardListIcon,
  },
];

function timeGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) {
    return "Good Morning";
  }
  if (hour < 17) {
    return "Good Afternoon";
  }
  return "Good Evening";
}

function formatMoney(currencyCode: string, amount: number): string {
  const code = currencyCode && currencyCode !== "—" ? currencyCode : "KES";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

function SummaryItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2Icon;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-background text-foreground ring-1 ring-border">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="space-y-1">
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </dt>
        <dd className="text-sm font-medium text-foreground">{value}</dd>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CircleDollarSignIcon;
  label: string;
  value: string;
}) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-md bg-muted text-foreground">
            <Icon className="size-4" aria-hidden />
          </span>
          <CardDescription>{label}</CardDescription>
        </div>
        <CardTitle className="text-2xl tracking-tight">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function FutureModuleDialog({
  module,
  onClose,
}: {
  module: FutureModule;
  onClose: () => void;
}) {
  const Icon = module.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="future-module-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Icon className="size-5" aria-hidden />
            </span>
            <div>
              <h3 id="future-module-title" className="text-lg font-semibold">
                {module.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                This module will be available in a future Build Pack.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <XIcon className="size-4" />
          </Button>
        </div>
        <Button type="button" className="w-full" onClick={onClose}>
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}

export function BusinessDashboard({ data }: BusinessDashboardProps) {
  const [futureModule, setFutureModule] = useState<FutureModule | null>(null);
  // Client-local time for Good Morning / Afternoon / Evening.
  const greeting = timeGreeting(new Date());

  const salesPlaceholder = useMemo(
    () => formatMoney(data.baseCurrencyCode, 0),
    [data.baseCurrencyCode]
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="space-y-4 border-b border-border pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LayoutDashboardIcon className="size-4" aria-hidden />
              <span>Operational workspace</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {greeting}, {data.currentUserName}
            </h1>
            <p className="text-lg text-foreground/90">
              Welcome back to {data.businessName}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-800 ring-1 ring-emerald-200">
                <BadgeCheckIcon className="size-3.5" aria-hidden />
                Status: {data.businessStatusCode}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 font-medium text-foreground ring-1 ring-border">
                Role: {data.roleLabel}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            {data.canSwitchBusiness ? (
              <Link
                href="/select-business"
                prefetch={false}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-full sm:w-auto"
                )}
              >
                <ArrowLeftRightIcon className="size-4" aria-hidden />
                Switch Business
              </Link>
            ) : null}
            <Link
              href="/home"
              prefetch={false}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "w-full sm:w-auto"
              )}
            >
              <HomeIcon className="size-4" aria-hidden />
              Platform Home
            </Link>
          </div>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          This is your operational workspace.
          <br />
          Manage your businesses from Platform Home.
        </p>
      </header>

      <section aria-labelledby="kpi-heading" className="space-y-3">
        <div className="flex items-center gap-2">
          <ActivityIcon className="size-5 text-foreground" aria-hidden />
          <h2 id="kpi-heading" className="text-lg font-semibold">
            Today at a glance
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={CircleDollarSignIcon}
            label="Today's Sales"
            value={salesPlaceholder}
          />
          <KpiCard icon={ReceiptIcon} label="Orders" value="0" />
          <KpiCard icon={UsersIcon} label="Customers" value="0" />
          <KpiCard icon={PackageIcon} label="Products" value="0" />
        </div>
      </section>

      <section aria-labelledby="business-summary-heading" className="space-y-3">
        <div className="flex items-center gap-2">
          <Building2Icon className="size-5" aria-hidden />
          <h2 id="business-summary-heading" className="text-lg font-semibold">
            Business Summary
          </h2>
        </div>
        <Card>
          <CardContent className="grid gap-3 pt-6 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryItem
              icon={FactoryIcon}
              label="Industry"
              value={data.industryName}
            />
            <SummaryItem
              icon={ClipboardListIcon}
              label="Business type"
              value={data.businessTypeName}
            />
            <SummaryItem
              icon={Globe2Icon}
              label="Country"
              value={data.countryName}
            />
            <SummaryItem
              icon={WalletCardsIcon}
              label="Base currency"
              value={data.baseCurrencyCode}
            />
            <SummaryItem
              icon={Building2Icon}
              label="Branches"
              value={data.branchCount}
            />
            <SummaryItem
              icon={UsersIcon}
              label="Employees"
              value={data.employeeCount}
            />
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="quick-actions-heading" className="space-y-3">
        <div className="flex items-center gap-2">
          <LayoutDashboardIcon className="size-5" aria-hidden />
          <h2 id="quick-actions-heading" className="text-lg font-semibold">
            Quick Actions
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/settings"
            prefetch={false}
            className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="h-full gap-3 py-4 transition-colors hover:bg-muted/30">
              <CardHeader className="px-4">
                <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
                  <Settings2Icon className="size-5" aria-hidden />
                </div>
                <CardTitle className="text-base">Business Settings</CardTitle>
                <CardDescription>
                  Configure how this business operates.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4">
                <p className="text-xs font-medium text-emerald-800">
                  Open settings
                </p>
              </CardContent>
            </Card>
          </Link>

          {FUTURE_MODULES.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => setFutureModule(action)}
                className="rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="h-full gap-3 py-4 transition-colors hover:bg-muted/30">
                  <CardHeader className="px-4">
                    <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                      <Icon className="size-5" aria-hidden />
                    </div>
                    <CardTitle className="text-base">{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="px-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      Tap to learn more
                    </p>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="business-health-heading" className="space-y-3">
        <div className="flex items-center gap-2">
          <ActivityIcon className="size-5" aria-hidden />
          <h2 id="business-health-heading" className="text-lg font-semibold">
            Business Health
          </h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile Completion</CardTitle>
            <CardDescription>
              {data.profileCompletionPercent}% complete based on BP-001 setup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all"
                style={{ width: `${data.profileCompletionPercent}%` }}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Completed</p>
                <ul className="space-y-2 text-sm">
                  {data.healthCompleted.map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <span className="text-emerald-700" aria-hidden>
                        ✓
                      </span>
                      <span>{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Remaining</p>
                {data.healthRemaining.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {data.healthRemaining.map((item) => (
                      <li key={item.id} className="flex items-start gap-2">
                        <span className="text-muted-foreground" aria-hidden>
                          ○
                        </span>
                        <span>{item.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nothing remaining — looking healthy.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section
        aria-labelledby="setup-progress-heading"
        className="grid gap-4 lg:grid-cols-2"
      >
        <div className="space-y-3">
          <h2 id="setup-progress-heading" className="text-lg font-semibold">
            Setup Progress
          </h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Completed milestones</CardTitle>
              <CardDescription>
                Onboarding steps already finished for this business.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {data.completedMilestones.map((item) => (
                  <li key={item.id} className="flex items-start gap-2">
                    <span className="text-emerald-700" aria-hidden>
                      ✓
                    </span>
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Optional remaining</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recommended next steps</CardTitle>
              <CardDescription>
                Optional setup you can complete later without blocking operations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.optionalRemaining.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {data.optionalRemaining.map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <span className="text-muted-foreground" aria-hidden>
                        ○
                      </span>
                      <span>{item.label}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  All recommended optional setup is complete.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section aria-labelledby="notifications-heading" className="space-y-3">
        <div className="flex items-center gap-2">
          <BellIcon className="size-5" aria-hidden />
          <h2 id="notifications-heading" className="text-lg font-semibold">
            Notifications
          </h2>
        </div>
        <div className="space-y-3">
          {data.notifications.map((notification) => (
            <Card key={notification.id} className="gap-2 py-4">
              <CardHeader className="px-4">
                <div className="mb-1 flex size-9 items-center justify-center rounded-md bg-muted">
                  <BellIcon className="size-4" aria-hidden />
                </div>
                <CardTitle className="text-base">{notification.title}</CardTitle>
                <CardDescription>{notification.body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {futureModule ? (
        <FutureModuleDialog
          module={futureModule}
          onClose={() => setFutureModule(null)}
        />
      ) : null}
    </main>
  );
}
