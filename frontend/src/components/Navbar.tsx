"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

import {
  Home,
  MessageSquare,
  Compass,
  FileText,
  Settings,
  Users,
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  TrendingUp,
  Briefcase,
  BarChart3,
} from "lucide-react";

type Role = "admin" | "student" | "professor" | null;

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
}

function NavLink({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.path}
      className={`
        group relative flex items-center justify-center
        w-9 h-9 rounded-lg transition-all duration-200
        ${active
          ? "bg-gradient-to-br from-blue-600/20 to-indigo-600/10 text-white border border-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.1)] scale-105"
          : "text-white/40 hover:bg-white/5 hover:text-white hover:scale-105"
        }
      `}
    >
      <Icon size={14} strokeWidth={active ? 2.2 : 1.8} />

      {/* Left indicator line */}
      {active && (
        <span className="absolute left-[-6px] w-[3px] h-4 rounded-r-full bg-blue-500" />
      )}

      {/* Tooltip */}
      <span
        className="
          pointer-events-none absolute left-full ml-3 z-[60]
          px-2.5 py-1 rounded-md
          bg-slate-950 border border-white/5 shadow-xl
          text-white text-[10px] font-medium whitespace-nowrap
          opacity-0 translate-x-[-4px]
          group-hover:opacity-100 group-hover:translate-x-0
          transition-all duration-150
        "
      >
        {item.label}
        {/* Arrow */}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-950" />
      </span>
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const { role, loading, userName } = useAuth();
  const searchParams = useSearchParams();
  const sourceParam = searchParams?.get("source");
  
  let selectedMode = "courses";
  if (pathname?.startsWith("/personal") || sourceParam === "personal") {
    selectedMode = "personal";
  } else if (pathname?.startsWith("/courses") || pathname === "/" || sourceParam === "courses") {
    selectedMode = "courses";
  }

  // Student: Home, Chat, My Classes, Learning, Practice, Documents, Analytics, Settings
  const studentNavItems: NavItem[] = [
    { id: "home", label: "Home", path: selectedMode === "personal" ? "/personal" : "/courses", icon: Home },
    { id: "chat", label: "Chat", path: "/chat", icon: MessageSquare },
    { id: "classes", label: "My Classes", path: "/classes", icon: BookOpen },
    { id: "learning", label: "Learning", path: `/learning?source=${selectedMode}`, icon: Compass },
    { id: "practice", label: "Practice", path: `/practice?source=${selectedMode}`, icon: ClipboardCheck },
    { id: "documents", label: "Documents", path: "/documents", icon: FileText },
    { id: "analytics", label: "Analytics", path: "/analytics", icon: LayoutDashboard },
    { id: "settings", label: "Settings", path: "/settings", icon: Settings },
  ];

  // Professor: Dashboard, My Classes, Students, Resources, Assignments, Settings
  const professorNavItems: NavItem[] = [
    { id: "dashboard", label: "Dashboard", path: "/professor", icon: Home },
    { id: "classes", label: "My Classes", path: "/classes", icon: BookOpen },
    { id: "students", label: "Students", path: "/students", icon: Users },
    { id: "resources", label: "Resources", path: "/resources", icon: FileText },
    // { id: "assignments", label: "Assignments", path: "/professor/assignments", icon: ClipboardCheck },
    { id: "settings", label: "Settings", path: "/settings", icon: Settings },
  ];

  // Admin: Dashboard, Students, Professors, Settings
  const adminNavItems: NavItem[] = [
    { id: "dashboard", label: "Admin Dashboard", path: "/admin", icon: LayoutDashboard },
    { id: "students", label: "Students", path: "/students", icon: Users },
    { id: "professors", label: "Professors", path: "/professors", icon: Briefcase },
    { id: "settings", label: "Settings", path: "/settings", icon: Settings },
  ];

  const roleBasedNav: Record<Exclude<Role, null>, NavItem[]> = {
    admin: adminNavItems,
    professor: professorNavItems,
    student: studentNavItems,
  };

  const navItems = role ? roleBasedNav[role] : [];



  const isActive = (path: string) => {
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
    
    if (path === "/professor") {
       return pathname === "/professor" && !searchParams?.get("tab");
    }
    
    return !!pathname?.startsWith(pathBase);
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-14 z-50 bg-slate-950/70 backdrop-blur-xl border-r border-white/5 shadow-2xl flex flex-col items-center justify-between py-4 select-none">

      {/* TOP: Logo + Nav */}
      <div className="flex flex-col items-center gap-4 w-full">

        {/* Logo */}
        <Link
          href="/"
          className="group relative flex items-center justify-center w-9 h-9 mb-1 hover:scale-105 transition-transform duration-200"
        >
          <Image
            src="/mentor-logo.png"
            alt="Mentor AI"
            width={28}
            height={28}
            className="rounded-xl shadow-[0_0_15px_rgba(91,95,255,0.15)]"
          />
          {/* Logo tooltip */}
          <span className="pointer-events-none absolute left-full ml-3 z-[60] px-2.5 py-1 rounded-md bg-slate-950 border border-white/5 shadow-xl text-white text-[10px] font-semibold whitespace-nowrap opacity-0 translate-x-[-4px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150">
            Mentor AI
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-950" />
          </span>
        </Link>

        {/* Divider */}
        <div className="w-6 h-px bg-white/5" />

        {/* Nav icons */}
        <nav className="flex flex-col items-center gap-1.5">
          {loading ? (
            <div className="w-8 h-8 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : role === null ? (
            /* Unauthenticated: just show login icon */
            <NavLink
              item={{ id: "login", label: "Login", path: "/login", icon: Home }}
              active={false}
            />
          ) : (
            navItems.map((item: NavItem) => (
              <NavLink
                key={item.id}
                item={item}
                active={isActive(item.path)}
              />
            ))
          )}
        </nav>
      </div>

      {/* BOTTOM: Avatar */}
      {role && !loading && (
        <Link href="/profile" className="group relative">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-650 flex items-center justify-center text-white text-xs font-bold hover:ring-2 hover:ring-blue-500/40 hover:scale-105 shadow-[0_0_12px_rgba(59,130,246,0.15)] transition-all duration-200">
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </div>

          {/* Avatar tooltip */}
          <span className="pointer-events-none absolute left-full ml-3 z-[60] px-2.5 py-1 rounded-md bg-slate-950 border border-white/5 shadow-xl whitespace-nowrap opacity-0 translate-x-[-4px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 bottom-0">
            <span className="block text-white text-[10px] font-medium">{userName || "User"}</span>
            <span className="block text-white/40 text-[9px] capitalize">{role}</span>
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-950" />
          </span>
        </Link>
      )}
    </aside>
  );
}