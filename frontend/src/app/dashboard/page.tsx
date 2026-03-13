"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardPage from "@/app/pages/DashboardPage";
import AdminDashboardPage from "@/app/pages/AdminDashboardPage";
import LoginForm from "@/components/LoginForm";

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

  const handleLoginSuccess = () => {
    const userId = localStorage.getItem("user_id");
    const storedRole = localStorage.getItem("role") as "admin" | "student" | null;
    setIsAuthenticated(true);
    setRole(storedRole);
    router.refresh();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-center">Login Required</h2>
        <LoginForm onLoginSuccess={handleLoginSuccess} redirectAfterLogin="/dashboard" />
      </div>
    );
  }

  return role === "admin" ? <AdminDashboardPage /> : <DashboardPage />;
}
