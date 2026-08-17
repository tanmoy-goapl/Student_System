"use client";
 
import Navbar from "@/components/Navbar";
import Loader from "@/components/Loader";
import { DashboardLoadingShell } from "@/components/DashboardLoading";
import TopBar from "./navbar/TopBar";
import { Suspense } from "react";
import PerformanceSidebar from "./performancepage/Left/PerformanceSidebar";
 
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
 
interface SidebarRoute {
  match: string;
  component: React.ReactNode;
}
 
import ProfessorSidebar from "@/professor/components/ProfessorSidebar";
import AdminSidebar from "@/admin/components/AdminSidebar";
import ChatSessionProvider from "@/components/ChatSessionProvider";
import ProfessorGenerationProvider from "@/professor/components/ProfessorGenerationProvider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
 
  const isLogin = pathname === "/login";
 
  const { role, userId, userName, loading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
 
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
 
  const isProfessorRoute = pathname?.startsWith("/professor");
  const isAdminRoute = pathname?.startsWith("/admin");
  const isStudioRoute = isProfessorRoute || isAdminRoute;

  if (loading && isAdminRoute) {
    return <DashboardLoadingShell role="admin" text="Loading..." />;
  }

  if (loading && isProfessorRoute) {
    return <DashboardLoadingShell role="professor" text="Loading..." />;
  }

  if (loading || (!role && !isLogin)) {
    return (
      <Loader fullScreen text="Loading..." />
    );
  }
 
  return (
    <ChatSessionProvider userId={userId} role={role} userName={userName}>
      <ProfessorGenerationProvider enabled={role === "professor"}>
      <div className="h-screen bg-[#090D1F] flex overflow-hidden">
      {/* Main sidebar (left) */}
      {!isLogin && !isStudioRoute && (
        <Suspense fallback={<div className="fixed left-0 top-0 h-screen w-64 z-50 bg-slate-950/70" />}>
          {role === "admin" ? (
            <AdminSidebar />
          ) : role === "professor" ? (
            <ProfessorSidebar />
          ) : (
            <Navbar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
          )}
        </Suspense>
      )}
 
      {/* Everything right of the main sidebar */}
      <div className={`flex flex-1 min-w-0 transition-all duration-300 ${!isLogin && !isStudioRoute && role !== "admin" && role !== "professor" ? (sidebarCollapsed ? "pl-16" : "pl-56") : ""}`}>
 
        {/* Secondary Sidebar (learning, practice, performance) */}
        {!isLogin && activeSidebar && (
          <div className="h-screen shrink-0 overflow-y-auto purple-scrollbar">
            {activeSidebar}
          </div>
        )}
 
        {/* Main content column */}
        <div className="flex flex-col flex-1 h-screen overflow-hidden min-w-0">
 
          {/* TopBar — sticky, shrink-0 */}
          {!isLogin && !isStudioRoute && (
            <header className="sticky top-0 z-[100] h-16 shrink-0 border-b border-white/5 bg-[#090D1F]/70 backdrop-blur-md flex items-center">
              <Suspense fallback={<div className="h-full w-full bg-[#020617]" />}>
                <TopBar />
              </Suspense>
            </header>
          )}
 
          {/* Main content area with right sidebar */}
          <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">
            {/* Page content */}
            <main className="flex-1 min-w-0 overflow-auto purple-scrollbar">
              {children}
            </main>
 
          </div>
        </div>
      </div>
      </div>
      </ProfessorGenerationProvider>
    </ChatSessionProvider>
  );
}