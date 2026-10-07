"use client";

import React, { Suspense } from "react";
import ProfessorChatPage from "@/professor/chatbot/ProfessorChatPage";
import { DashboardLoadingShell } from "@/components/DashboardLoading";

export default function ProfessorChatbotRoute() {
  return (
    <Suspense fallback={<DashboardLoadingShell role="professor" text="Loading Chatbot..." />}>
      <ProfessorChatPage />
    </Suspense>
  );
}
