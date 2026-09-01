/**
 * Purpose:
 * Pure BP-009 IP-12 procurement analytics rules. Read-only calculations only.
 */

import { PROCUREMENT_SAVINGS_FORMULA } from "@/modules/procurement/constants";
import type {
  ProcurementAnalyticsKpiView,
  ProcurementLifecycleNodeView,
} from "@/modules/procurement/types";

export function calculateRate(numerator: number, denominator: number): string {
  if (denominator <= 0) {
    return "0%";
  }
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

export function calculateSavings(estimated: number, awarded: number): string {
  return (estimated - awarded).toFixed(2);
}

export function daysBetween(start: Date | string | null, end: Date | string | null): number | null {
  if (!start || !end) {
    return null;
  }
  const from = typeof start === "string" ? new Date(start) : start;
  const to = typeof end === "string" ? new Date(end) : end;
  const diff = to.getTime() - from.getTime();
  if (Number.isNaN(diff)) {
    return null;
  }
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

export function explainCycleTime(nodes: ProcurementLifecycleNodeView[]): {
  cycleTimeDays: number | null;
  explanation: string | null;
} {
  const withTimestamps = nodes.filter((row) => row.timestamp);
  if (withTimestamps.length < 2) {
    return {
      cycleTimeDays: null,
      explanation: "Cycle time needs at least two dated lifecycle steps.",
    };
  }
  const first = withTimestamps[0]!;
  const last = withTimestamps[withTimestamps.length - 1]!;
  const cycleTimeDays = daysBetween(first.timestamp, last.timestamp);
  return {
    cycleTimeDays,
    explanation: `From ${first.label} (${first.timestamp?.slice(0, 10)}) to ${last.label} (${last.timestamp?.slice(0, 10)}).`,
  };
}

export function sortLifecycleNodes(nodes: ProcurementLifecycleNodeView[]) {
  return [...nodes].sort((left, right) => {
    const leftTime = left.timestamp ? new Date(left.timestamp).getTime() : 0;
    const rightTime = right.timestamp ? new Date(right.timestamp).getTime() : 0;
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return left.label.localeCompare(right.label);
  });
}

export function toAnalyticsCsv(rows: Array<Record<string, string>>): string {
  if (rows.length === 0) {
    return "";
  }
  const headers = Object.keys(rows[0]!);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => `"${(row[header] ?? "").replaceAll('"', '""')}"`).join(","));
  }
  return lines.join("\n");
}

export function savingsKpi(estimated: number, awarded: number): ProcurementAnalyticsKpiView {
  return {
    id: "savings-vs-estimate",
    label: "Savings vs estimate",
    value: calculateSavings(estimated, awarded),
    drilldownHref: null,
    formula: PROCUREMENT_SAVINGS_FORMULA,
  };
}
