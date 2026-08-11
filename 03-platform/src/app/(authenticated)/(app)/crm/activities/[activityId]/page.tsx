/**
 * BP-004 / IP-05 Activity detail route.
 */

import { redirect } from "next/navigation";

import { getCrmActivityAction } from "@/modules/crm-activity/actions/crm-activity-actions";
import { CrmActivityWorkspace } from "@/modules/crm-activity/components/crm-activity-workspace";

type PageProps = {
  params: Promise<{ activityId: string }>;
};

export default async function CrmActivityDetailPage({ params }: PageProps) {
  const { activityId } = await params;
  const result = await getCrmActivityAction(activityId);

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Activity</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error.message}</p>
      </main>
    );
  }

  return <CrmActivityWorkspace activity={result.data} />;
}
