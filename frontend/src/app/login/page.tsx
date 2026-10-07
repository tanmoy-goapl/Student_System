"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import LoginScreen from "@/components/login/LoginScreen";

function LoginWithNextQuery() {
  const searchParams = useSearchParams();
  const next = searchParams?.get("next");
  return <LoginScreen redirectAfterLogin={next || undefined} />;
}

export default function LoginRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-[#050a14] via-[#0a1628] to-[#050a14]" />
      }
    >
      <LoginWithNextQuery />
    </Suspense>
  );
}
