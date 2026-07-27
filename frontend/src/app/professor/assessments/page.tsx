"use client";

import React, { Suspense } from "react";
import AssessmentsPage from "@/professor/assessments/AssessmentsPage";
import Loader from "@/components/Loader";

export default function ProfessorAssessmentsRoute() {
  return (
    <Suspense fallback={<Loader fullScreen text="Loading Assessments..." />}>
      <AssessmentsPage />
    </Suspense>
  );
}
