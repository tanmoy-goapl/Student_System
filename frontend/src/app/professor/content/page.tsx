"use client";

import React, { Suspense } from "react";
import ContentPage from "@/professor/content/ContentPage";
import { DashboardLoadingShell } from "@/components/DashboardLoading";

export default function ProfessorContentRoute() {
  return (
    <Suspense fallback={<DashboardLoadingShell role="professor" text="Loading Content..." />}>
      <ContentPage />
    </Suspense>
  );
}
