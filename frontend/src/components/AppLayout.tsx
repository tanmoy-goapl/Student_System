"use client";

import Navbar from "@/components/Navbar";
import { usePathname } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isHome = pathname === "/";
  const isLogin = pathname === "/login";

  return (
    <div className="min-h-screen bg-[#020617]">
      {/* Sidebar */}
      {!isLogin && <Navbar />}

      {/* Main Content */}
      <main
        className={`
    transition-all duration-100
    ${isLogin ? "" : "ml-64"}
    ${isLogin ? "w-full" : "max-w-4xl"}
  `}
      >
        {children}
      </main>
    </div>
  );
}