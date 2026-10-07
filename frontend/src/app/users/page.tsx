"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageLoadingState } from "@/components/DashboardLoading";

export default function UsersRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/users");
  }, [router]);

  return <PageLoadingState text="Redirecting..." />;
}
