"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import {
  Home,
  MessageSquare,
  FileText,
  Settings,
  Users,
  LayoutDashboard,
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
          ? "bg-blue-500/20 text-white"
          : "text-white/50 hover:bg-white/8 hover:text-white"
        }
      `}
    >
      <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />

      {/* Active dot */}
      {active && (
        <span className="absolute right-1 top-1 w-1 h-1 rounded-full bg-blue-400" />
      )}

      {/* Tooltip */}
      <span
        className="
          pointer-events-none absolute left-full ml-3 z-[60]
          px-2.5 py-1 rounded-md
          bg-[#0f172a] border border-white/10 shadow-xl
          text-white text-[11px] font-medium whitespace-nowrap
          opacity-0 translate-x-[-4px]
          group-hover:opacity-100 group-hover:translate-x-0
          transition-all duration-150
        "
      >
        {item.label}
        {/* Arrow */}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#0f172a]" />
      </span>
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();

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
    return () => window.removeEventListener("storage", updateData);
  }, [pathname]);

  const commonNavItems: NavItem[] = [
    { id: "home", label: "Home", path: "/", icon: Home },
    { id: "chat", label: "Chat", path: "/chat", icon: MessageSquare },
  ];

  const adminNavItems: NavItem[] = [
    { id: "documents", label: "Documents", path: "/documents", icon: FileText },
    { id: "users", label: "Users", path: "/users", icon: Users },
    { id: "dashboard", label: "Analytics", path: "/dashboard", icon: LayoutDashboard },
    { id: "settings", label: "Settings", path: "/settings", icon: Settings },
  ];

  const studentNavItems: NavItem[] = [
    { id: "learning", label: "Learning", path: "/learning", icon: BookOpen },
    { id: "practice", label: "Practice", path: "/practice", icon: ClipboardCheck },
    { id: "performance", label: "Performance", path: "/performance", icon: TrendingUp },
    { id: "career", label: "Career", path: "/career", icon: Briefcase },
    { id: "documents", label: "Documents", path: "/documents", icon: FileText },
    { id: "settings", label: "Settings", path: "/settings", icon: Settings },
  ];

  const roleBasedNav: Record<Exclude<Role, null>, NavItem[]> = {
    admin: adminNavItems,
    student: studentNavItems,
  };

  const navItems =
    role && roleBasedNav[role]
      ? [...commonNavItems, ...roleBasedNav[role]]
      : commonNavItems;

  const isActive = (path: string) =>
    path === "/"
      ? pathname === "/"
      : !!pathname?.startsWith(path);

  return (
    <aside className="fixed left-0 top-0 h-screen w-14 z-50 mentor-navbar shadow-lg flex flex-col items-center justify-between py-3">

      {/* TOP: Logo + Nav */}
      <div className="flex flex-col items-center gap-4 w-full">

        {/* Logo */}
        <Link
          href="/"
          className="group relative flex items-center justify-center w-9 h-9 mb-1"
        >
          <Image
            src="/mentor-logo.png"
            alt="Mentor AI"
            width={28}
            height={28}
            className="rounded-xl"
          />
          {/* Logo tooltip */}
          <span className="pointer-events-none absolute left-full ml-3 z-[60] px-2.5 py-1 rounded-md bg-[#0f172a] border border-white/10 shadow-xl text-white text-[11px] font-semibold whitespace-nowrap opacity-0 translate-x-[-4px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150">
            Mentor AI
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#0f172a]" />
          </span>
        </Link>

        {/* Divider */}
        <div className="w-6 h-px bg-white/10" />

        {/* Nav icons */}
        <nav className="flex flex-col items-center gap-1">
          {roleLoaded && role === null ? (
            /* Unauthenticated: just show login icon */
            <NavLink
              item={{ id: "login", label: "Login", path: "/login", icon: Home }}
              active={false}
            />
          ) : (
            navItems.map((item) => (
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
      {role && userName && (
        <Link href="/profile" className="group relative">
          <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white text-xs font-semibold hover:ring-2 hover:ring-cyan-400/50 transition-all">
            {userName.charAt(0).toUpperCase()}
          </div>

          {/* Avatar tooltip */}
          <span className="pointer-events-none absolute left-full ml-3 z-[60] px-2.5 py-1 rounded-md bg-[#0f172a] border border-white/10 shadow-xl whitespace-nowrap opacity-0 translate-x-[-4px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 bottom-0">
            <span className="block text-white text-[11px] font-medium">{userName}</span>
            <span className="block text-white/50 text-[10px] capitalize">{role}</span>
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#0f172a]" />
          </span>
        </Link>
      )}
    </aside>
  );
}