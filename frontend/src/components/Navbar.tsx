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
  Plus,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const [role, setRole] = useState<"admin" | "student" | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);

  useEffect(() => {
    const updateData = () => {
      const storedRole = localStorage.getItem("role") as
        | "admin"
        | "student"
        | null;
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

  const navItems = [
    { id: "home", label: "Home", path: "/", icon: Home },
    { id: "chat", label: "Chat", path: "/chat", icon: MessageSquare },
    ...(role
      ? [
        {
          id: "documents",
          label: "Documents",
          path: "/documents",
          icon: FileText,
        },
      ]
      : []),
    ...(role
      ? [
        {
          id: "settings",
          label: "Settings",
          path: "/settings",
          icon: Settings,
        },
      ]
      : []),
  ];

  const filteredNavItems =
    role === "admin"
      ? [...navItems, { id: "users", label: "Users", path: "/users", icon: Users }, { id: "dashboard", label: "Analytics", path: "/dashboard", icon: LayoutDashboard },]
      : navItems;

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname?.startsWith(path);

  return (
<aside className="fixed left-0 top-0 h-screen w-64 z-50 mentor-navbar shadow-lg flex flex-col justify-between">
      {/* TOP SECTION */}
      <div>
        {/* Brand */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-white/10">
          <Image
            src="/mentor-logo.png"
            alt="Mentor AI"
            width={30}
            height={30}
            className="rounded-xl"
          />
          <span className="text-sm font-bold text-white">Mentor AI</span>
        </div>
        {/* New Chat Button */}
        <div className="px-2">
          <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold hover:opacity-90 transition">
            <Plus size={12} />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      <div>
        {/* Navigation */}
        <div className="px-4 py-2 border-t border-white/10 flex flex-col">
          <span className="text-white text-xs mb-2">Navigation</span>

          {/* Scrollable container */}
          <div className="max-h-[30vh] overflow-y-auto pr-1">
            <nav className="flex flex-col gap-2">
              {roleLoaded && role === null ? (
                <>
                  <Link href="/" className="sidebar-link">Features</Link>
                  <Link href="/" className="sidebar-link">How it Works</Link>
                  <Link href="/login" className="sidebar-link">Login</Link>
                  <Link href="/chat" className="sidebar-btn">
                    Get Started
                  </Link>
                </>
              ) : (
                filteredNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.id}
                      href={item.path}
                      className={`sidebar-link flex items-center gap-3 ${isActive(item.path) ? "active" : ""
                        }`}
                    >
                      <Icon size={15} color="white" />
                      <span className="text-white text-xs">{item.label}</span>
                    </Link>
                  );
                })
              )}
            </nav>
          </div>
        </div>
        {/* User Info */}
        {role && userName && (
          <div className="px-4 py-4 border-t border-white/10 flex items-center gap-2">

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white text-sm font-semibold">
              {userName.charAt(0).toUpperCase()}
            </div>

            {/* User Info */}
            <div className="flex flex-col">
              <span className="text-xs font-medium text-white">
                {userName}
              </span>
              <span className="text-xs text-white/70 capitalize">
                {role}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}