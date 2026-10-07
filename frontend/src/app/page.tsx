"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Loader from "@/components/Loader";

export default function Root() {
  const router = useRouter();
  const { role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    
    if (role === "admin") {
      router.replace("/admin");
    } else if (role === "professor") {
      router.replace("/classes");
    } else {
      router.replace("/courses");
    }
  }, [role, loading, router]);

  return <Loader fullScreen text="Loading..." />;
}
