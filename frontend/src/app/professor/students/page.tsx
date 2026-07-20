"use client";

import React, { Suspense } from "react";
import StudentsPage from "@/professor/students/StudentsPage";
import Loader from "@/components/Loader";

export default function ProfessorStudentsRoute() {
  return (
    <Suspense fallback={<Loader fullScreen text="Loading Students..." />}>
      <StudentsPage />
    </Suspense>
  );
}
