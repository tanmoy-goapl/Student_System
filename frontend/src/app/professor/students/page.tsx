"use client";

import React, { Suspense } from "react";
import StudentsPage from "@/professor/students/StudentsPage";
import { DashboardLoadingShell } from "@/components/DashboardLoading";

export default function ProfessorStudentsRoute() {
  return (
    <Suspense fallback={<DashboardLoadingShell role="professor" text="Loading Students..." />}>
      <StudentsPage />
    </Suspense>
  );
}
