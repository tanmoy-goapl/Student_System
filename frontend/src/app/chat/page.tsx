"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChatPage from "@/app/pages/ChatPage";
import Loader from "@/components/Loader";

export default function Chat() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    const role = localStorage.getItem("role");
    const authenticated = !!userId && !!role;
    setIsAuthenticated(authenticated);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login?next=/chat");
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <Loader fullScreen text="Loading..." />
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-md">
        <p className="text-gray-400">Redirecting to login…</p>
      </div>
    );
  }

  return <ChatPage />;
}
