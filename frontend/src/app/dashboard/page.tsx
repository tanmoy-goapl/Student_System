"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardPage from "@/app/pages/DashboardPage";
import AdminDashboardPage from "@/app/pages/AdminDashboardPage";

export default function Dashboard() {
  const [role, setRole] = useState<"admin" | "student" | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    const storedRole = localStorage.getItem("role") as "admin" | "student" | null;
    const authenticated = !!userId && !!storedRole;
    setIsAuthenticated(authenticated);
    setRole(storedRole);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login?next=/dashboard");
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-md">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-md">
        <p className="text-gray-400">Redirecting to login…</p>
      </div>
    );
  }

  return role === "admin" ? <AdminDashboardPage /> : <DashboardPage />;
}
