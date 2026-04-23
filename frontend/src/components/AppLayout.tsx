"use client";

import Navbar from "@/components/Navbar";
import Loader from "@/components/Loader";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const isHome = pathname === "/";
  const isLogin = pathname === "/login";

  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    const role = localStorage.getItem("role");

    const authenticated = !!userId && !!role;
    setIsAuthenticated(authenticated);
    setLoading(false);

    // redirect logic
    if (!authenticated && !isLogin) {
      router.replace(`/login?next=${pathname}`);
    }
  }, [pathname, isLogin, router]);


  // prevent flicker when redirecting
  if (!isAuthenticated && !isLogin) {
    return (
      <Loader fullScreen text="Loading..." />
    );
  }

  return (
    <div className="min-h-screen bg-[#020617]">
      {/* Navbar */}
      {!isLogin && <Navbar />}

      {/* Main Content */}
      <main
        className={`
          transition-all duration-100
          ${isLogin ? "" : "ml-64"}
        `}
      >
        {children}
      </main>
    </div>
  );
}