"use client";

import React, { Suspense } from "react";
import ClassroomsPage from "@/professor/classrooms/ClassroomsPage";
import { DashboardLoadingShell } from "@/components/DashboardLoading";

export default function ProfessorClassroomsRoute() {
  return (
    <Suspense fallback={<DashboardLoadingShell role="professor" text="Loading Classes..." />}>
      <ClassroomsPage />
    </Suspense>
  );
}
