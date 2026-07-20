"use client";

import React, { Suspense } from "react";
import HomeView from "@/professor/dashboard/HomeView";
import Loader from "@/components/Loader";

export default function ProfessorDashboardRoute() {
  return (
    <Suspense fallback={<Loader fullScreen text="Loading Dashboard..." />}>
      <HomeView />
    </Suspense>
  );
}
