"use client";

import React, { Suspense } from "react";
import AnalyticsPage from "@/admin/analytics/AnalyticsPage";
import { DashboardLoadingShell } from "@/components/DashboardLoading";

export default function AdminAnalyticsRoute() {
  return (
    <Suspense fallback={<DashboardLoadingShell role="admin" text="Loading Analytics..." />}>
      <AnalyticsPage />
    </Suspense>
  );
}
