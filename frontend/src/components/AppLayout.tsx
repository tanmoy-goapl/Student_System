"use client";

import Navbar from "@/components/Navbar";
import Loader from "@/components/Loader";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import TopBar from "./navbar/TopBar";
import LearningSidebar from "./learningpage/LearningSidebar";

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

  const isLogin = pathname === "/login";

  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  useEffect(() => {
    const userId =
      localStorage.getItem("user_id");

    const role =
      localStorage.getItem("role");

    const authenticated =
      !!userId && !!role;

    setIsAuthenticated(authenticated);
    setLoading(false);

    if (!authenticated && !isLogin) {
      router.replace(
        `/login?next=${pathname}`
      );
    }
  }, [pathname, isLogin, router]);

  const sidebarRoutes: SidebarRoute[] = [
    {
      match: "/learning",
      component: <LearningSidebar />,
    },

    // Future Sidebars
    // {
    //   match: "/settings",
    //   component: <SettingsSidebar />,
    // },
  ];

  const activeSidebar = useMemo(() => {
    return sidebarRoutes.find((route) =>
      pathname?.startsWith(route.match)
    )?.component;
  }, [pathname]);

  if (loading) {
    return (
      <Loader
        fullScreen
        text="Loading..."
      />
    );
  }

  if (!isAuthenticated && !isLogin) {
    return (
      <Loader
        fullScreen
        text="Loading..."
      />
    );
  }

return (
  <div className="h-screen bg-[#020617] flex overflow-hidden">
    {!isLogin && <Navbar />}

    {/* Everything right of the main sidebar — no overflow-hidden here */}
    <div className={`flex flex-1 ${!isLogin ? "ml-14" : ""}`}>

      {/* Secondary Sidebar */}
      {!isLogin && activeSidebar && (
        <div className="h-screen shrink-0 overflow-y-auto">
          {activeSidebar}
        </div>
      )}

      {/* Main content column — h-screen creates the scroll boundary */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden">

        {/* TopBar — sticky now works: fixed height column + overflow-hidden above */}
        {!isLogin && (
          <header className="sticky top-0 z-40 h-16 shrink-0 border-b border-white/10 bg-[#020617] flex items-center">
            <TopBar />
          </header>
        )}

        {/* Page content — the only thing that scrolls */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  </div>
);
}