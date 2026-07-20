"use client";

import React, { Suspense } from "react";
import PlacementsPage from "@/admin/placements/PlacementsPage";
import Loader from "@/components/Loader";

export default function AdminPlacementsRoute() {
  return (
    <Suspense fallback={<Loader fullScreen text="Loading Placements..." />}>
      <PlacementsPage />
    </Suspense>
  );
}
