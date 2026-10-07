"use client";

import React, { Suspense } from "react";
import InsightsPage from "@/professor/insights/InsightsPage";
import { DashboardLoadingShell } from "@/components/DashboardLoading";

export default function ProfessorInsightsRoute() {
  return (
    <Suspense fallback={<DashboardLoadingShell role="professor" text="Loading Insights..." />}>
      <InsightsPage />
    </Suspense>
  );
}
