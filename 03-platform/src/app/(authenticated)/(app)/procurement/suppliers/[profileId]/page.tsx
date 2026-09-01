import { redirect } from "next/navigation";

import {
  getProcurementCataloguesAction,
  getProcurementSupplierAction,
} from "@/modules/procurement/actions/procurement-actions";
import { getSupplierPerformanceAction } from "@/modules/procurement/actions/performance-actions";
import { SupplierProfileWorkspace } from "@/modules/procurement/components/supplier-profile-workspace";

type PageProps = {
  params: Promise<{ profileId: string }>;
};

export default async function ProcurementSupplierProfilePage({ params }: PageProps) {
  const { profileId } = await params;
  const [profile, catalogues, performance] = await Promise.all([
    getProcurementSupplierAction(profileId),
    getProcurementCataloguesAction(),
    getSupplierPerformanceAction(profileId),
  ]);
  if (!profile.success) {
    if (
      profile.error.code === "SESSION_REQUIRED" ||
      profile.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/procurement/suppliers");
  }
  if (!catalogues.success || !performance.success) {
    redirect("/procurement/suppliers");
  }
  return (
    <SupplierProfileWorkspace
      initial={profile.data}
      catalogues={catalogues.data}
      performance={performance.data}
    />
  );
}
