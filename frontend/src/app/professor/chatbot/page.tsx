"use client";

import React, { Suspense } from "react";
import ProfessorChatPage from "@/professor/chatbot/ProfessorChatPage";
import Loader from "@/components/Loader";

export default function ProfessorChatbotRoute() {
  return (
    <Suspense fallback={<Loader fullScreen text="Loading Chatbot..." />}>
      <ProfessorChatPage />
    </Suspense>
  );
}
