"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DocumentsPage from "@/app/pages/DocumentsPage";

export default function Documents() {
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push("/profile");
    return null;
  }

  return <DocumentsPage />;
}
