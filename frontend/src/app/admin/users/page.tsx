"use client";

import React, { Suspense } from "react";
import UsersPage from "@/admin/users/UsersPage";
import { DashboardLoadingShell } from "@/components/DashboardLoading";

export default function AdminUsersRoute() {
  return (
    <Suspense fallback={<DashboardLoadingShell role="admin" text="Loading Users..." />}>
      <UsersPage />
    </Suspense>
  );
}
