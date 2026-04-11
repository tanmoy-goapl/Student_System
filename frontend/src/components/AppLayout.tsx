"use client";

import Navbar from "@/components/Navbar";
import { usePathname } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isLogin = pathname === "/login";

  return (
    <div
      className={`min-h-screen ${
        isHome || isLogin ? "bg-[#020617]" : "bg-gray-100"
      }`}
    >
      {!isLogin && <Navbar />}
      <main
        className={
          isHome || isLogin ? "w-full" : "max-w-4xl mx-auto px-6 py-10"
        }
      >
        {children}
      </main>
    </div>
  );
}
