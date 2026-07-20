"use client";

import React, { Suspense } from "react";
import InsightsPage from "@/professor/insights/InsightsPage";
import Loader from "@/components/Loader";

export default function ProfessorInsightsRoute() {
  return (
    <Suspense fallback={<Loader fullScreen text="Loading Insights..." />}>
      <InsightsPage />
    </Suspense>
  );
}
