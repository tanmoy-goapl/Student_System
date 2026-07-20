"use client";

import React, { Suspense } from "react";
import AdminChatPage from "@/admin/chatbot/AdminChatPage";
import Loader from "@/components/Loader";

export default function AdminChatbotRoute() {
  return (
    <Suspense fallback={<Loader fullScreen text="Loading Chatbot..." />}>
      <AdminChatPage />
    </Suspense>
  );
}
