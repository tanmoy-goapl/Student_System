"use client";

import React, { Suspense } from "react";
import AnalyticsPage from "@/admin/analytics/AnalyticsPage";
import Loader from "@/components/Loader";

export default function AdminAnalyticsRoute() {
  return (
    <Suspense fallback={<Loader fullScreen text="Loading Analytics..." />}>
      <AnalyticsPage />
    </Suspense>
  );
}
