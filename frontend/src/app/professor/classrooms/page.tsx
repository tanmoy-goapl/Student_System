"use client";

import React, { Suspense } from "react";
import ClassroomsPage from "@/professor/classrooms/ClassroomsPage";
import Loader from "@/components/Loader";

export default function ProfessorClassroomsRoute() {
  return (
    <Suspense fallback={<Loader fullScreen text="Loading Classes..." />}>
      <ClassroomsPage />
    </Suspense>
  );
}
