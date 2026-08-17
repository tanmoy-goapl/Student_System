"use client";

import React, { Suspense } from "react";
import HomeView from "@/professor/dashboard/HomeView";
import { DashboardLoadingShell } from "@/components/DashboardLoading";

export default function ProfessorDashboardRoute() {
  return (
    <Suspense fallback={<DashboardLoadingShell role="professor" text="Loading Dashboard..." />}>
      <HomeView />
    </Suspense>
  );
}
