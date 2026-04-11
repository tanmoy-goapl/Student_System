"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const [role, setRole] = useState<"admin" | "student" | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("role") as "admin" | "student" | null;
  });
  const [roleLoaded, setRoleLoaded] = useState(true);

  useEffect(() => {
    const updateRole = () => {
      const storedRole = localStorage.getItem("role") as "admin" | "student" | null;
      setRole(storedRole);
      setRoleLoaded(true);
    };

    // Initial load
    updateRole();

    // Listen for storage changes (when user logs in/out)
    window.addEventListener("storage", updateRole);
    
    // Also check on pathname change (in case of same-tab navigation)
    updateRole();

    return () => {
      window.removeEventListener("storage", updateRole);
    };
  }, [pathname]);

  const navItems = [
    { id: "home", label: "HOME", path: "/" },
    { id: "dashboard", label: "DASHBOARD", path: "/dashboard" },
    { id: "profile", label: "PROFILE", path: "/profile" },
    // documents tab should only be visible after login (role is set)
    ...(role ? [{ id: "documents", label: "DOCUMENTS", path: "/documents" }] : []),
    { id: "chat", label: "CHAT", path: "/chat" },
    // { id: "integrations", label: "INTEGRATIONS", path: "/integrations" },
    // settings page should also only be visible after login
    ...(role ? [{ id: "settings", label: "SETTINGS", path: "/settings" }] : []),
  ];

  // Only add users page for admin - explicitly check role
  const filteredNavItems =
    role === "admin"
      ? [...navItems, { id: "users", label: "USERS", path: "/users" }]
      : navItems;

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname?.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-30 mentor-navbar shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/mentor-logo.png"
              alt="Mentor AI"
              width={100}
              height={100}
              className="w-9 h-9 rounded-xl"
              priority
            />
            <span className="text-lg font-bold text-white">Mentor AI</span>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-5 flex-wrap justify-end">
            {/* Marketing / signed-out state (matches screenshot) */}
            {roleLoaded && role === null ? (
              <>
                <Link href="/" className="text-sm font-medium text-white/90 hover:text-white transition-colors">
                  Features
                </Link>
                <Link href="/" className="text-sm font-medium text-white/90 hover:text-white transition-colors">
                  How it Works
                </Link>
                <Link href="/login" className="text-sm font-medium text-white/90 hover:text-white transition-colors">
                  Login
                </Link>
                <Link
                  href="/chat"
                  className="ml-1 inline-flex items-center px-4 py-2 rounded-lg font-semibold shadow-sm transition-colors mentor-get-started"
                >
                  Get Started
                </Link>
              </>
            ) : (
              <>
                {filteredNavItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.path}
                    className={`text-sm font-medium uppercase tracking-wide transition-colors ${
                      isActive(item.path)
                        ? "text-white font-bold border-b-2 border-cyan-300 pb-1"
                        : "text-white/90 hover:text-cyan-200"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </>
            )}
          </nav>
        </div>
      </div>
      {/* subtle divider */}
      <div className="h-px bg-white/5" />
    </header>
  );
}

