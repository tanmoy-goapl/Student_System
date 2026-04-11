"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState({
    userId: "",
    role: "",
    name: "",
    email: "",
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    const role = localStorage.getItem("role");
    const name = localStorage.getItem("user_name");
    const email = localStorage.getItem("user_email");
    const authenticated = !!userId && !!role;
    setIsAuthenticated(authenticated);
    setUserInfo({
      userId: userId || "",
      role: role || "",
      name: name || "",
      email: email || "",
    });
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || isAuthenticated) return;
    router.replace("/login?next=/profile");
  }, [ready, isAuthenticated, router]);

  if (!ready) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-md">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-md">
        <p className="text-gray-400">Redirecting to login…</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-6 text-2xl font-bold">Profile</h2>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
          <div className="rounded border bg-gray-50 px-3 py-2 capitalize text-gray-800">
            {userInfo.name || "Not available"}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
          <div className="rounded border bg-gray-50 px-3 py-2 text-gray-800">
            {userInfo.email || "Not available"}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">User ID</label>
          <div className="rounded border bg-gray-50 px-3 py-2 text-gray-800">
            {userInfo.userId || "Not available"}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
          <div className="rounded border bg-gray-50 px-3 py-2 capitalize text-gray-800">
            {userInfo.role || "Not available"}
          </div>
        </div>
        <div className="mt-6 border-t pt-4">
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("user_id");
              localStorage.removeItem("role");
              localStorage.removeItem("user_name");
              localStorage.removeItem("user_email");
              setIsAuthenticated(false);
              setUserInfo({ userId: "", role: "", name: "", email: "" });
              router.replace("/login?next=/profile");
            }}
            className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
