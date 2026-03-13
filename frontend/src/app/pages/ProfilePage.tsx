"use client";

import { useState, useEffect } from "react";
import LoginForm from "@/components/LoginForm";

export default function ProfilePage() {
  const [userInfo, setUserInfo] = useState({
    userId: "",
    role: "",
    name: "",
    email: "",
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
  }, []);

  const handleLoginSuccess = () => {
    const userId = localStorage.getItem("user_id");
    const role = localStorage.getItem("role");
    const name = localStorage.getItem("user_name");
    const email = localStorage.getItem("user_email");
    setIsAuthenticated(true);
    setUserInfo({
      userId: userId || "",
      role: role || "",
      name: name || "",
      email: email || "",
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-center">Login Required</h2>
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Profile</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <div className="px-3 py-2 bg-gray-50 rounded border text-gray-800 capitalize">
            {userInfo.name || "Not available"}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <div className="px-3 py-2 bg-gray-50 rounded border text-gray-800">
            {userInfo.email || "Not available"}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
          <div className="px-3 py-2 bg-gray-50 rounded border text-gray-800">
            {userInfo.userId || "Not available"}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <div className="px-3 py-2 bg-gray-50 rounded border text-gray-800 capitalize">
            {userInfo.role || "Not available"}
          </div>
        </div>
        <div className="mt-6 pt-4 border-t">
          <button
            onClick={() => {
              localStorage.removeItem("user_id");
              localStorage.removeItem("role");
              localStorage.removeItem("user_name");
              localStorage.removeItem("user_email");
              setIsAuthenticated(false);
              setUserInfo({ userId: "", role: "", name: "", email: "" });
            }}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
