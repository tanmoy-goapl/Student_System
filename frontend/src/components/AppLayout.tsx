"use client";
 
import Navbar from "@/components/Navbar";
import Loader from "@/components/Loader";
import TopBar from "./navbar/TopBar";
import LearningSidebar from "./learningpage/LearningSidebar";
import PracticeSidebar from "./practicepage/Left/PracticeSidebar";
import PerformanceSidebar from "./performancepage/Left/PerformanceSidebar";
import RightSidebar from "@/components/RightSidebar";
 
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
 
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
 
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
 
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
 
  if (loading) {
    return (
      <Loader fullScreen text="Loading..." />
    );
  }
 
  if (!isAuthenticated && !isLogin) {
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
            <header className="sticky top-0 z-40 h-16 shrink-0 border-b border-white/10 bg-[#020617] flex items-center">
              <TopBar rightOpen={rightOpen} onRightOpenChange={setRightOpen} />
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