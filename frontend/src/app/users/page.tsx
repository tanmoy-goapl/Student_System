"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UsersPage from "@/app/pages/UsersPage";

export default function Users() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      router.push("/");
    } else {
      setIsAdmin(true);
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return <UsersPage />;
}
