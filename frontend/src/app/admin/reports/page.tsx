"use client";

import React, { Suspense } from "react";
import ReportsPage from "@/admin/reports/ReportsPage";
import Loader from "@/components/Loader";

export default function AdminReportsRoute() {
  return (
    <Suspense fallback={<Loader fullScreen text="Loading Reports..." />}>
      <ReportsPage />
    </Suspense>
  );
}
