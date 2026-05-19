"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

import {
  Home,
  MessageSquare,
  FileText,
  Settings,
  Users,
  LayoutDashboard,
  Plus,
  BookOpen,
  ClipboardCheck,
  TrendingUp,
  Briefcase,
} from "lucide-react";

type Role = "admin" | "student" | null;

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [role, setRole] = useState<Role>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);

  useEffect(() => {
    const updateData = () => {
      const storedRole = localStorage.getItem("role") as Role;
      const storedName = localStorage.getItem("user_name");

      setRole(storedRole);
      setUserName(storedName);
      setRoleLoaded(true);
    };

    updateData();

    window.addEventListener("storage", updateData);

    return () => {
      window.removeEventListener("storage", updateData);
    };
  }, [pathname]);

  /* -------------------------------- */
  /* COMMON NAVIGATION                */
  /* -------------------------------- */

  const commonNavItems: NavItem[] = [
    {
      id: "home",
      label: "Home",
      path: "/",
      icon: Home,
    },
    {
      id: "chat",
      label: "Chat",
      path: "/chat",
      icon: MessageSquare,
    },
  ];

  /* -------------------------------- */
  /* ADMIN NAVIGATION                 */
  /* -------------------------------- */

  const adminNavItems: NavItem[] = [
    {
      id: "documents",
      label: "Documents",
      path: "/documents",
      icon: FileText,
    },
    {
      id: "users",
      label: "Users",
      path: "/users",
      icon: Users,
    },
    {
      id: "dashboard",
      label: "Analytics",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "settings",
      label: "Settings",
      path: "/settings",
      icon: Settings,
    },
  ];

  /* -------------------------------- */
  /* STUDENT NAVIGATION               */
  /* -------------------------------- */

  const studentNavItems: NavItem[] = [
    {
      id: "learning",
      label: "Learning",
      path: "/learning",
      icon: BookOpen,
    },
    {
      id: "practice",
      label: "Practice",
      path: "/practice",
      icon: ClipboardCheck,
    },
    {
      id: "performance",
      label: "Performance",
      path: "/performance",
      icon: TrendingUp,
    },
    {
      id: "career",
      label: "Career",
      path: "/career",
      icon: Briefcase,
    },
    {
      id: "documents",
      label: "Documents",
      path: "/documents",
      icon: FileText,
    },
    {
      id: "settings",
      label: "Settings",
      path: "/settings",
      icon: Settings,
    },
  ];

  /* -------------------------------- */
  /* FINAL NAVIGATION                 */
  /* -------------------------------- */

  const roleBasedNav: Record<Exclude<Role, null>, NavItem[]> = {
    admin: adminNavItems,
    student: studentNavItems,
  };

  const navItems =
    role && roleBasedNav[role]
      ? [...commonNavItems, ...roleBasedNav[role]]
      : commonNavItems;

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname?.startsWith(path);

  return (
    <aside className="fixed left-0 top-0 h-screen w-55 z-50 mentor-navbar shadow-lg flex flex-col justify-between">
      {/* TOP SECTION */}
      <div>
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 px-4 py-4">
          <Image
            src="/mentor-logo.png"
            alt="Mentor AI"
            width={30}
            height={30}
            className="rounded-xl"
          />

          <span className="text-sm font-bold text-white">
            Mentor AI
          </span>
        </Link>

        {/* New Chat Button */}
        {/* <div className="px-3">
          <button
            onClick={() => {
              window.dispatchEvent(new Event("new-chat"));

              if (pathname !== "/chat") {
                router.push("/chat");
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold hover:opacity-90 transition"
          >
            <Plus size={14} />

            <span>New Chat</span>
          </button>
        </div> */}

        {/* Navigation */}
        <div className="px-3 py-2 border-t border-white/10">
          <span className="text-[11px] uppercase tracking-wider text-white/50 px-2">
            Navigation
          </span>

          <nav className="flex flex-col gap-1 mt-3">
            {roleLoaded && role === null ? (
              <>
                <Link href="/" className="sidebar-link">
                  Features
                </Link>

                <Link href="/" className="sidebar-link">
                  How it Works
                </Link>

                <Link href="/login" className="sidebar-link">
                  Login
                </Link>

                <Link href="/chat" className="sidebar-btn">
                  Get Started
                </Link>
              </>
            ) : (
              navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    className={`
                      group relative flex items-center justify-between
                      px-3 py-2 rounded-lg transition-all duration-200
                      ${
                        isActive(item.path)
                          ? "bg-blue-500/15 text-white"
                          : "text-white/70 hover:bg-white/5 hover:text-white"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={12} />

                      <span className="text-xs">
                        {item.label}
                      </span>
                    </div>

                    {isActive(item.path) && (
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </Link>
                );
              })
            )}
          </nav>
        </div>
      </div>

      {/* USER INFO */}
      {role && userName && (
        <Link href="/profile">
          <div className="px-4 py-4 border-t border-white/10 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-cyan-500 flex items-center justify-center text-white text-sm font-semibold">
              {userName.charAt(0).toUpperCase()}
            </div>

            {/* User Info */}
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium text-white truncate">
                {userName}
              </span>

              <span className="text-xs text-white/60 capitalize">
                {role}
              </span>
            </div>
          </div>
        </Link>
      )}
    </aside>
  );
}