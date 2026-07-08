"use client";
 
import Navbar from "@/components/Navbar";
import Loader from "@/components/Loader";
import TopBar from "./navbar/TopBar";
import { Suspense } from "react";
import PerformanceSidebar from "./performancepage/Left/PerformanceSidebar";
import RightSidebar from "@/components/RightSidebar";
 
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
 
interface SidebarRoute {
  match: string;
  component: React.ReactNode;
}
 
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isChatPage = pathname?.startsWith("/chat");
 
  const isLogin = pathname === "/login";
 
  const { role, loading } = useAuth();
  const [rightOpen, setRightOpen] = useState(false);
 
  useEffect(() => {
    if (loading) return;
 
    if (!role && !isLogin) {
      router.replace(`/login?next=${pathname}`);
      return;
    }

    // Strict Route Guards
    if (role && !isLogin && pathname) {
      if (role === "admin") {
        if (["/courses", "/personal", "/learning", "/practice", "/roadmap", "/performance"].some(r => pathname.startsWith(r))) {
          window.location.href = "/admin";
        }
      } else if (role === "student") {
        if (["/professor", "/admin", "/professors", "/departments"].some(r => pathname.startsWith(r))) {
          window.location.href = "/courses";
        }
      } else if (role === "professor") {
        if (["/courses", "/personal", "/learning", "/practice", "/roadmap", "/analytics", "/documents", "/performance"].some(r => pathname.startsWith(r))) {
          window.location.href = "/professor";
        }
      }
    }
  }, [pathname, isLogin, router, role, loading]);
 
  const sidebarRoutes: SidebarRoute[] = [
    {
      match: "/performance",
      component: <PerformanceSidebar />,
    },
  ];
 
  const activeSidebar = useMemo(() => {
    return sidebarRoutes.find((route) =>
      pathname?.startsWith(route.match)
    )?.component;
  }, [pathname]);
 
  if (loading || (!role && !isLogin)) {
    return (
      <Loader fullScreen text="Loading..." />
    );
  }
 
  return (
    <div className="h-screen bg-[#020617] flex overflow-hidden">
      {/* Main sidebar (left) */}
      {!isLogin && <Navbar />}
 
      {/* Everything right of the main sidebar */}
      <div className={`flex flex-1 min-w-0 ${!isLogin ? "pl-14" : ""}`}>
 
        {/* Secondary Sidebar (learning, practice, performance) */}
        {!isLogin && activeSidebar && (
          <div className="h-screen shrink-0 overflow-y-auto purple-scrollbar">
            {activeSidebar}
          </div>
        )}
 
        {/* Main content column */}
        <div className="flex flex-col flex-1 h-screen overflow-hidden min-w-0">
 
          {/* TopBar — sticky, shrink-0 */}
          {!isLogin && (
            <header className="sticky top-0 z-40 h-16 shrink-0 border-b border-white/5 bg-slate-950/70 backdrop-blur-md flex items-center">
              <Suspense fallback={<div className="h-full w-full bg-[#020617]" />}>
                <TopBar rightOpen={rightOpen} onRightOpenChange={setRightOpen} />
              </Suspense>
            </header>
          )}
 
          {/* Main content area with right sidebar */}
          <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">
            {/* Page content */}
            <main className="flex-1 min-w-0 overflow-auto purple-scrollbar">
              {children}
            </main>
 
            {/* Right insights panel — only on chat page */}
            {isChatPage && (
              <div className={`shrink-0 h-full min-h-0 border-l border-white/8 bg-[#080d19]/80 backdrop-blur-xl overflow-hidden transition-all duration-300 ease-in-out ${rightOpen ? "w-64" : "w-0"}`}>
                <div className="w-64 h-full overflow-y-auto purple-scrollbar">
                  <RightSidebar />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}