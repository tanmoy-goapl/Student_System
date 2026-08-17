"use client";

import React, { Suspense } from "react";
import AssessmentsPage from "@/professor/assessments/AssessmentsPage";
import { DashboardLoadingShell } from "@/components/DashboardLoading";

export default function ProfessorAssessmentsRoute() {
  return (
    <Suspense fallback={<DashboardLoadingShell role="professor" text="Loading Assessments..." />}>
      <AssessmentsPage />
    </Suspense>
  );
}
