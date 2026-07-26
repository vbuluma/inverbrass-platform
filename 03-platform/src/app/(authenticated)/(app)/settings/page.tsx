/**
 * Purpose:
 * Business Settings — view BP-001 configuration for the active business.
 *
 * Design rationale:
 * Operational settings live inside the business context (not Platform Home).
 * This page surfaces configuration already captured during setup.
 *
 * Why this exists:
 * Dashboard Quick Action "Business Settings" needs an existing BP-001 destination.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeftIcon,
  Building2Icon,
  Globe2Icon,
  ReceiptIcon,
  Settings2Icon,
  WalletCardsIcon,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSetupReviewAction } from "@/modules/business/onboarding/actions/setup-actions";
import { cn } from "@/lib/utils";

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export default async function BusinessSettingsPage() {
  const review = await getSetupReviewAction();

  if (!review.success) {
    redirect("/dashboard");
  }

  const data = review.data;
  const paymentMethods = [
    data.paymentMethods.cashEnabled ? "Cash" : null,
    data.paymentMethods.mobileMoneyEnabled ? "Mobile Money" : null,
    data.paymentMethods.bankTransferEnabled ? "Bank Transfer" : null,
    data.paymentMethods.cardEnabled ? "Card" : null,
    data.paymentMethods.creditSalesEnabled ? "Credit Sales" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <Link
          href="/dashboard"
          prefetch={false}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "w-fit gap-2 px-0"
          )}
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          Back to dashboard
        </Link>
        <div className="flex items-start gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
            <Settings2Icon className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Business Settings
            </h1>
            <p className="text-sm text-muted-foreground">
              Configuration for {data.businessName}. Advanced editing arrives in
              later Build Packs.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2Icon className="size-4" aria-hidden />
            <CardTitle className="text-base">Business profile</CardTitle>
          </div>
          <CardDescription>Identity and classification</CardDescription>
        </CardHeader>
        <CardContent>
          <dl>
            <SettingRow label="Business name" value={data.businessName} />
            <SettingRow label="Trading name" value={data.tradingName} />
            <SettingRow label="Industry" value={data.industryName} />
            <SettingRow label="Business type" value={data.businessTypeName} />
            <SettingRow label="Email" value={data.email || "—"} />
            <SettingRow
              label="Address"
              value={[data.physicalAddress, data.city, data.county]
                .filter(Boolean)
                .join(", ") || "—"}
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe2Icon className="size-4" aria-hidden />
            <CardTitle className="text-base">Operating context</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <dl>
            <SettingRow label="Country" value={data.countryName} />
            <SettingRow
              label="Base currency"
              value={data.baseCurrencyCode || "—"}
            />
            <SettingRow
              label="Additional currencies"
              value={
                data.additionalCurrencyCodes.length > 0
                  ? data.additionalCurrencyCodes.join(", ")
                  : "None"
              }
            />
            <SettingRow
              label="Branches"
              value={
                data.branches.length > 0
                  ? data.branches.map((branch) => branch.name).join(", ")
                  : "None"
              }
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <WalletCardsIcon className="size-4" aria-hidden />
            <CardTitle className="text-base">Payments & tax</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <dl>
            <SettingRow
              label="Payment methods"
              value={paymentMethods || "None"}
            />
            <SettingRow
              label="Tax"
              value={
                data.receipt.taxEnabled
                  ? `${data.receipt.defaultTaxName || "VAT"} · ${
                      data.receipt.defaultTaxRate
                    }%`
                  : "Disabled"
              }
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ReceiptIcon className="size-4" aria-hidden />
            <CardTitle className="text-base">Receipt branding</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <dl>
            <SettingRow
              label="Receipt prefix"
              value={data.receipt.receiptPrefix}
            />
            <SettingRow
              label="Receipt footer"
              value={data.receipt.receiptFooter || "—"}
            />
            <SettingRow
              label="Show logo on receipt"
              value={data.receipt.showLogoOnReceipt ? "Yes" : "No"}
            />
          </dl>
        </CardContent>
      </Card>
    </main>
  );
}
