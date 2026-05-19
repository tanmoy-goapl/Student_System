"use client";

import Navbar from "@/components/Navbar";
import Loader from "@/components/Loader";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import TopBar from "./navbar/TopBar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const isLogin = pathname === "/login";

  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    const role = localStorage.getItem("role");

    const authenticated = !!userId && !!role;

    setIsAuthenticated(authenticated);
    setLoading(false);

    if (!authenticated && !isLogin) {
      router.replace(`/login?next=${pathname}`);
    }
  }, [pathname, isLogin, router]);

  if (loading) {
    return <Loader fullScreen text="Loading..." />;
  }

  if (!isAuthenticated && !isLogin) {
    return <Loader fullScreen text="Loading..." />;
  }

  return (
    <div className="min-h-screen bg-[#020617]">
      {/* Sidebar */}
      {!isLogin && <Navbar />}

      {/* Right Section */}
      <div className={!isLogin ? "ml-55" : ""}>
        {/* Top Bar */}
        {!isLogin && (
          <header className="h-16 border-b border-white/10 bg-[#020617] px-6 flex items-center">
            <TopBar />
          </header>
        )}

        {/* Page Content */}
        <main className="">
          {children}
        </main>
      </div>
    </div>
  );
}