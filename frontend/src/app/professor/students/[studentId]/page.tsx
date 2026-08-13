"use client";

import React, { Suspense } from "react";
import StudentProfilePage from "@/professor/students/StudentProfilePage";
import Loader from "@/components/Loader";

export default function ProfessorStudentProfileRoute() {
  return (
    <Suspense fallback={<Loader fullScreen text="Loading student profile..." />}>
      <StudentProfilePage />
    </Suspense>
  );
}
