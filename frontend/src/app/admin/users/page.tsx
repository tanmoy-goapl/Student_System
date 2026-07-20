"use client";

import React, { Suspense } from "react";
import UsersPage from "@/admin/users/UsersPage";
import Loader from "@/components/Loader";

export default function AdminUsersRoute() {
  return (
    <Suspense fallback={<Loader fullScreen text="Loading Users..." />}>
      <UsersPage />
    </Suspense>
  );
}
