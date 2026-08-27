"use client";

/**
 * Purpose:
 * Operational workspace for payment reviews. Catalogue filters only.
 *
 * Implementation Package:
 * BP-007 / IP-08 – Payment Exceptions, Operations & Controls
 */

import { useMemo, useState } from "react";
import { ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState, PlatformKpiCard } from "@/components/platform";
import {
  PAYMENT_EXCEPTION_STATUS_LABELS,
  PAYMENT_EXCEPTION_TYPE_LABELS,
} from "@/modules/payments/constants";
import type { PaymentExceptionDashboardView } from "@/modules/payments/types";

type PaymentExceptionsWorkspaceProps = {
  data: PaymentExceptionDashboardView;
  view?: string;
};

const VIEWS: Array<{ id: string; label: string }> = [
  { id: "open", label: "Open" },
  { id: "investigating", label: "Investigating" },
  { id: "resolved", label: "Resolved" },
  { id: "high", label: "High severity" },
  { id: "unknown", label: "Unknown payments" },
  { id: "mismatch", label: "Confirmation mismatches" },
  { id: "duplicate", label: "Duplicate references" },
  { id: "settlement", label: "Settlement exceptions" },
];

export function PaymentExceptionsWorkspace({
  data,
  view = "open",
}: PaymentExceptionsWorkspaceProps) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [exceptionType, setExceptionType] = useState("");
  const [severity, setSeverity] = useState("");
  const [methodId, setMethodId] = useState("");
  const [networkId, setNetworkId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [transactionNumber, setTransactionNumber] = useState("");
  const [obligationNumber, setObligationNumber] = useState("");

  const items = useMemo(() => {
    return data.items.filter((row) => {
      if (view === "open" && row.status !== "OPEN") {
        return false;
      }
      if (view === "investigating" && row.status !== "INVESTIGATING") {
        return false;
      }
      if (view === "resolved" && row.status !== "RESOLVED") {
        return false;
      }
      if (view === "high" && row.severity !== "HIGH") {
        return false;
      }
      if (view === "unknown" && row.exceptionType !== "PAYMENT_UNKNOWN") {
        return false;
      }
      if (view === "mismatch" && !row.exceptionType.startsWith("CALLBACK_")) {
        return false;
      }
      if (view === "duplicate" && row.exceptionType !== "DUPLICATE_PROVIDER_REFERENCE") {
        return false;
      }
      if (view === "settlement" && row.exceptionType !== "SETTLEMENT_VARIANCE") {
        return false;
      }
      if (status && row.status !== status) {
        return false;
      }
      if (exceptionType && row.exceptionType !== exceptionType) {
        return false;
      }
      if (severity && row.severity !== severity) {
        return false;
      }
      if (methodId && row.methodId !== methodId) {
        return false;
      }
      if (networkId && row.networkId !== networkId) {
        return false;
      }
      if (providerId && row.providerId !== providerId) {
        return false;
      }
      if (channelId && row.channelId !== channelId) {
        return false;
      }
      if (
        transactionNumber &&
        !row.transactionNumber.toLowerCase().includes(transactionNumber.toLowerCase())
      ) {
        return false;
      }
      if (
        obligationNumber &&
        !row.obligationNumber.toLowerCase().includes(obligationNumber.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [
    data.items,
    view,
    status,
    exceptionType,
    severity,
    methodId,
    networkId,
    providerId,
    channelId,
    transactionNumber,
    obligationNumber,
  ]);

  function onView(next: string) {
    router.push(`/payments/exceptions?view=${next}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/payments" label="Payments" />
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-amber-50 text-amber-800 ring-1 ring-amber-200">
            <ShieldCheckIcon className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Payment reviews</h1>
            <p className="text-sm text-muted-foreground">
              Investigate payments that need a decision before they can continue.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformKpiCard label="Open" value={String(data.openCount)} />
        <PlatformKpiCard label="Investigating" value={String(data.investigatingCount)} />
        <PlatformKpiCard label="Resolved" value={String(data.resolvedCount)} />
        <PlatformKpiCard label="High severity" value={String(data.highSeverityCount)} />
      </div>

      <div className="flex flex-wrap gap-2">
        {VIEWS.map((row) => (
          <button
            key={row.id}
            type="button"
            className={`h-9 rounded-md border px-3 text-sm ${
              view === row.id ? "bg-slate-900 text-white" : "bg-white"
            }`}
            onClick={() => onView(row.id)}
          >
            {row.label}
          </button>
        ))}
      </div>

      <section className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1 text-sm">
          Status
          <select
            className="h-10 rounded-md border px-3"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All</option>
            {Object.entries(PAYMENT_EXCEPTION_STATUS_LABELS).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Type
          <select
            className="h-10 rounded-md border px-3"
            value={exceptionType}
            onChange={(event) => setExceptionType(event.target.value)}
          >
            <option value="">All</option>
            {Object.entries(PAYMENT_EXCEPTION_TYPE_LABELS).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Severity
          <select
            className="h-10 rounded-md border px-3"
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
          >
            <option value="">All</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          How they paid
          <select
            className="h-10 rounded-md border px-3"
            value={methodId}
            onChange={(event) => setMethodId(event.target.value)}
          >
            <option value="">All</option>
            {data.catalogues.methods.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Network
          <select
            className="h-10 rounded-md border px-3"
            value={networkId}
            onChange={(event) => setNetworkId(event.target.value)}
          >
            <option value="">All</option>
            {data.catalogues.networks.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Provider
          <select
            className="h-10 rounded-md border px-3"
            value={providerId}
            onChange={(event) => setProviderId(event.target.value)}
          >
            <option value="">All</option>
            {data.catalogues.providers.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Channel
          <select
            className="h-10 rounded-md border px-3"
            value={channelId}
            onChange={(event) => setChannelId(event.target.value)}
          >
            <option value="">All</option>
            {data.catalogues.channels.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Payment reference
          <input
            className="h-10 rounded-md border px-3"
            value={transactionNumber}
            onChange={(event) => setTransactionNumber(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Amount due record
          <input
            className="h-10 rounded-md border px-3"
            value={obligationNumber}
            onChange={(event) => setObligationNumber(event.target.value)}
          />
        </label>
      </section>

      {items.length === 0 ? (
        <PlatformEmptyState
          title="No payment reviews"
          description="Payments that need investigation will appear here."
        />
      ) : (
        <section className="rounded-xl border bg-white">
          <ul className="divide-y">
            {items.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/payments/exceptions/${row.id}`}
                  className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{row.exceptionNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {row.exceptionTypeLabel} · {row.transactionNumber}
                    </p>
                  </div>
                  <div className="text-sm sm:text-right">
                    <p>{row.paymentStatusLabel}</p>
                    <p className="text-muted-foreground">{row.statusLabel}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
