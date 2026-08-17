"use client";

import React, { Suspense } from "react";
import ReportsPage from "@/admin/reports/ReportsPage";
import { DashboardLoadingShell } from "@/components/DashboardLoading";

export default function AdminReportsRoute() {
  return (
    <Suspense fallback={<DashboardLoadingShell role="admin" text="Loading Reports..." />}>
      <ReportsPage />
    </Suspense>
  );
}
