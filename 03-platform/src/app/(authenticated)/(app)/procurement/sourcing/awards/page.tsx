import { redirect } from "next/navigation";

import { listSourcingEventsAction } from "@/modules/procurement/actions/sourcing-actions";
import { SourcingEventList } from "@/modules/procurement/components/sourcing-event-list";

export default async function SourcingAwardsPage() {
  const result = await listSourcingEventsAction({ view: "awards" });
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/procurement");
  }
  return <SourcingEventList initialRows={result.data} view="awards" />;
}
