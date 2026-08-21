"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { prepareChatForLogout, useChatSession } from "@/components/ChatSessionProvider";
import { 
  Home, MessageSquare, BookOpen, Compass, ClipboardCheck, 
  FileText, LayoutDashboard, Settings, Sparkles, LogOut,
  ChevronLeft, ChevronRight
} from "lucide-react";

interface NavbarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Navbar({ collapsed = false, onToggle }: NavbarProps) {
  const pathname = usePathname();
  const { role, loading, userName } = useAuth();
  const { startGeneralChat } = useChatSession();
  const [userEmail, setUserEmail] = useState("student@university.edu");
  const searchParams = useSearchParams();
  const sourceParam = searchParams?.get("source");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserEmail(localStorage.getItem("user_email") || "student@university.edu");
    }
  }, []);

  const handleLogout = () => {
    prepareChatForLogout();
    localStorage.removeItem("role");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_email");
    localStorage.removeItem("last_visited_class_path");
    window.dispatchEvent(new Event("storage"));
    window.location.href = "/";
  };
  
  let selectedMode = "courses";
  if (pathname?.startsWith("/personal") || sourceParam === "personal") {
    selectedMode = "personal";
  } else if (pathname?.startsWith("/courses") || pathname === "/" || sourceParam === "courses") {
    selectedMode = "courses";
  }

  // Student Navigation list
  const navItems = [
    { id: "home", label: "Home", path: selectedMode === "personal" ? "/personal" : "/courses", icon: Home },
    { id: "chat", label: "AI Chatbot", path: "/chat", icon: MessageSquare },
    { id: "classes", label: "My Classes", path: "/classes", icon: BookOpen },
    { id: "learning", label: "Learning Path", path: `/learning?source=${selectedMode}`, icon: Compass },
    { id: "practice", label: "Practice Arena", path: `/practice?source=${selectedMode}`, icon: ClipboardCheck },
    { id: "documents", label: "My Documents", path: "/documents", icon: FileText },
    { id: "analytics", label: "Performance", path: "/analytics", icon: LayoutDashboard },
    { id: "settings", label: "Settings", path: "/settings", icon: Settings },
  ];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const isActive = (path: string) => {
    if (pathname?.startsWith('/practice') && path.startsWith('/practice')) {
      return true;
    }

    if (pathname?.startsWith('/learning')) {
      if (path.startsWith('/learning')) return true;
      if (path.startsWith('/classes')) return false;
    }

    if (searchParams?.get('source') === 'classes') {
      if (path.startsWith('/classes')) return true;
      if (path.startsWith('/courses') || path === '/') return false;
    }

    if (path === "/") return pathname === "/";
    const pathBase = path.split('?')[0];
    const pathQuery = path.split('?')[1];
    
    if (pathQuery) {
      const queryParams = new URLSearchParams(pathQuery);
      for (const [key, value] of queryParams.entries()) {
        if (searchParams?.get(key) !== value) return false;
      }
      return pathname === pathBase;
    }
    
    return !!pathname?.startsWith(pathBase);
  };

  return (
    <aside className={`h-screen border-r border-white/5 bg-[#090D1F] flex flex-col justify-between select-none shrink-0 text-white font-sans fixed left-0 top-0 z-50 transition-all duration-300 ${collapsed ? "w-20" : "w-56"}`}>
      {/* Fixed Logo Header */}
      <div className={`p-4 shrink-0 flex ${collapsed ? "flex-col items-center gap-3" : "items-center justify-between"}`}>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-sm font-bold tracking-wider text-white">Mentor AI</h1>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none">Student Portal</p>
            </div>
          )}
        </div>
        {onToggle && (
          <button 
            onClick={onToggle}
            className={`p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors ${collapsed ? "" : ""}`}
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      {/* Scrollable Navigation */}
      <div className={`flex-1 overflow-y-auto purple-scrollbar px-3 pb-5 space-y-6 ${collapsed ? "scrollbar-none" : ""}`}>
        <div>
          {!collapsed && (
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold mb-3 px-3">Navigation</h2>
          )}
          <nav className="space-y-1.5">
            {loading ? (
              <div className="w-full py-4 flex justify-center">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              navItems.map(item => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    onClick={() => {
                      if (item.id === "chat") startGeneralChat();
                    }}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center rounded-xl text-xs font-semibold transition ${
                      collapsed ? "justify-center py-3 px-0 mx-auto w-12" : "gap-3 py-2.5 px-3"
                    } ${
                      active
                        ? "bg-gradient-to-r from-blue-600/20 to-indigo-650/10 text-white border border-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.1)]"
                        : "text-white/50 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <item.icon size={collapsed ? 18 : 15} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })
            )}
          </nav>
        </div>
      </div>

      {/* Footer Profile */}
      {role && !loading && (
        <div className={`p-4 border-t border-white/5 bg-black/10 flex shrink-0 ${collapsed ? "flex-col items-center gap-4" : "items-center justify-between gap-3"}`}>
          <div className="flex items-center gap-2.5 truncate max-w-full">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-650 flex items-center justify-center text-white text-xs font-bold shadow-[0_0_12px_rgba(59,130,246,0.15)] shrink-0">
              {getInitials(userName || "User")}
            </div>
            {!collapsed && (
              <div className="truncate">
                <h4 className="text-xs font-bold text-white leading-tight truncate">{userName || "Student User"}</h4>
                <p className="text-[9px] text-white/40 truncate">{userEmail || "student@university.edu"}</p>
              </div>
            )}
          </div>
          <button 
            onClick={handleLogout}
            className="h-8 w-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-rose-400 transition shrink-0"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </aside>
  );
}