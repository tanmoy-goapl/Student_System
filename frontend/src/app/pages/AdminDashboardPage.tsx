"use client";

import { useState, useEffect } from "react";
import { listUsers } from "@/lib/api";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalAdmins: 0,
    totalDocuments: 0,
  });
  const [loading, setLoading] = useState(true);

  const getAdminId = () => parseInt(localStorage.getItem("user_id") || "0", 10);

  useEffect(() => {
    async function loadStats() {
      const adminId = getAdminId();
      if (!adminId || isNaN(adminId)) {
        setLoading(false);
        return;
      }

      try {
        // Fetch users
        const users = await listUsers(adminId);
        const students = users.filter((u) => u.role === "student");
        const admins = users.filter((u) => u.role === "admin");

        // Fetch total documents count (sum of all users' documents)
        let totalDocs = 0;
        for (const user of users) {
          try {
            const docsRes = await fetch(`/api/documents?student_id=${user.id}`);
            if (docsRes.ok) {
              const docs = await docsRes.json();
              totalDocs += docs.length || 0;
            }
          } catch {
            // silent
          }
        }

        setStats({
          totalUsers: users.length,
          totalStudents: students.length,
          totalAdmins: admins.length,
          totalDocuments: totalDocs,
        });
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-400">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Admin Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-blue-50 rounded-lg">
          <div className="text-3xl font-bold text-blue-600 mb-2">{stats.totalUsers}</div>
          <div className="text-gray-600">Total Users</div>
        </div>
        <div className="p-6 bg-green-50 rounded-lg">
          <div className="text-3xl font-bold text-green-600 mb-2">{stats.totalStudents}</div>
          <div className="text-gray-600">Students</div>
        </div>
        <div className="p-6 bg-purple-50 rounded-lg">
          <div className="text-3xl font-bold text-purple-600 mb-2">{stats.totalAdmins}</div>
          <div className="text-gray-600">Admins</div>
        </div>
        <div className="p-6 bg-orange-50 rounded-lg">
          <div className="text-3xl font-bold text-orange-600 mb-2">{stats.totalDocuments}</div>
          <div className="text-gray-600">Total Documents</div>
        </div>
      </div>
    </div>
  );
}
