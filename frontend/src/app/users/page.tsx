"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UsersPage from "@/app/pages/UsersPage";
import Loader from "@/components/Loader";

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
      <Loader fullScreen text="Loading..." />
    );
  }

  if (!isAdmin) {
    return null;
  }

  return <UsersPage />;
}
