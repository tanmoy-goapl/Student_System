"use client";

import React, { Suspense } from "react";
import AdminChatPage from "@/admin/chatbot/AdminChatPage";
import { DashboardLoadingShell } from "@/components/DashboardLoading";

export default function AdminChatbotRoute() {
  return (
    <Suspense fallback={<DashboardLoadingShell role="admin" text="Loading Chatbot..." />}>
      <AdminChatPage />
    </Suspense>
  );
}
