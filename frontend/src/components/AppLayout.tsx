"use client";

import Navbar from "@/components/Navbar";
import { usePathname } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <div className={`min-h-screen ${isHome ? "bg-[#020617]" : "bg-gray-100"}`}>
      <Navbar />
      <main className={isHome ? "w-full" : "max-w-4xl mx-auto px-6 py-10"}>{children}</main>
    </div>
  );
}
