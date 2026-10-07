"use client";

import React, { Suspense } from "react";
import StudentProfilePage from "@/professor/students/StudentProfilePage";
import { DashboardLoadingShell } from "@/components/DashboardLoading";

export default function ProfessorStudentProfileRoute() {
  return (
    <Suspense fallback={<DashboardLoadingShell role="professor" text="Loading student profile..." />}>
      <StudentProfilePage />
    </Suspense>
  );
}
