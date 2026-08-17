"use client";

import React, { Suspense } from "react";
import PlacementsPage from "@/admin/placements/PlacementsPage";
import { DashboardLoadingShell } from "@/components/DashboardLoading";

export default function AdminPlacementsRoute() {
  return (
    <Suspense fallback={<DashboardLoadingShell role="admin" text="Loading Placements..." />}>
      <PlacementsPage />
    </Suspense>
  );
}
