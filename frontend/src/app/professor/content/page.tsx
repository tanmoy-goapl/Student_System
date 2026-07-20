"use client";

import React, { Suspense } from "react";
import ContentPage from "@/professor/content/ContentPage";
import Loader from "@/components/Loader";

export default function ProfessorContentRoute() {
  return (
    <Suspense fallback={<Loader fullScreen text="Loading Content..." />}>
      <ContentPage />
    </Suspense>
  );
}
