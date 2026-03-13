"use client";

import { useEffect, useState } from "react";
import { createUser, listUsers, deleteUser } from "@/lib/api";

export type UserRow = {
  id: number;
  name: string | null;
  department?: string | null;
  email: string;
  role: string;
};

function UserTable({
  users,
  loading,
  onDelete,
}: {
  users: UserRow[];
  loading: boolean;
  onDelete: (u: UserRow) => void;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-700 uppercase tracking-wide">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Name</th>
            <th className="px-4 py-3 text-left font-semibold">Department</th>
            <th className="px-4 py-3 text-left font-semibold">Email</th>
            <th className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={4} className="px-4 py-4 text-center text-gray-400">
                Loading users...
              </td>
            </tr>
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-4 text-center text-gray-400">
                No users found.
              </td>
            </tr>
          ) : (
            users.map((u) => {
              // Extract name from email if name is not set
              const displayName = u.name?.trim() || u.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, l => l.toUpperCase()) || "—";
              return (
              <tr key={u.id} className="border-t bg-white hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-800">
                  {displayName}
                </td>
                <td className="px-4 py-3 text-gray-800">
                  {u.department?.trim() || "—"}
                </td>
                <td className="px-4 py-3 text-gray-800">{u.email}</td>
                <td className="px-4 py-3 text-right">
                  {u.role !== "admin" && (
                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium"
                      onClick={() => onDelete(u)}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [userMsg, setUserMsg] = useState("");
  const [userError, setUserError] = useState("");
  const [userLoading, setUserLoading] = useState(false);

  useEffect(() => {
    const adminId = Number(localStorage.getItem("user_id") || 0);
    if (!adminId) return;
    const load = async () => {
      setUsersLoading(true);
      setUserError("");
      try {
        const data = await listUsers(adminId);
        setUsers(data);
        setFilteredUsers(data);
      } catch (err: any) {
        setUserError(err.message || "Failed to load users");
      } finally {
        setUsersLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = users.filter(
      (u) =>
        (u.name?.toLowerCase().includes(query) || false) ||
        (u.department?.toLowerCase().includes(query) || false) ||
        u.email.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword) {
      setUserError("Email and password are required");
      return;
    }
    const adminId = Number(localStorage.getItem("user_id") || 0);
    if (!adminId) {
      setUserError("Admin session expired. Please log in again.");
      return;
    }
    setUserError("");
    setUserMsg("");
    setUserLoading(true);
    try {
      await createUser(
        adminId,
        newEmail,
        newPassword,
        "student",
        newName || undefined,
        newDepartment || undefined
      );
      setUserMsg(`User "${newEmail}" created as student.`);
      setNewName("");
      setNewDepartment("");
      setNewEmail("");
      setNewPassword("");
      const data = await listUsers(adminId);
      setUsers(data);
      setFilteredUsers(data);
    } catch (err: any) {
      setUserError(err.message || "Failed to create user");
    } finally {
      setUserLoading(false);
    }
  };

  const handleDelete = async (u: UserRow) => {
    const adminId = Number(localStorage.getItem("user_id") || 0);
    if (!adminId) {
      setUserError("Admin session expired. Please log in again.");
      return;
    }
    if (!confirm(`Delete user "${u.email}"?`)) return;
    try {
      setUserError("");
      await deleteUser(adminId, u.id);
      const updated = users.filter((usr) => usr.id !== u.id);
      setUsers(updated);
      setFilteredUsers(updated);
    } catch (err: any) {
      setUserError(err.message || "Failed to delete user");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            title="Create user"
          >
            <span className="mr-2">+</span>
            Add User
          </button>
        </div>

        <div className="mb-4 flex items-center gap-4">
          <input
            type="text"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Search users (name, email)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <UserTable users={filteredUsers} loading={usersLoading} onDelete={handleDelete} />

        {showCreateForm && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <h2 className="text-lg font-semibold">Create New User</h2>

            {userError && (
              <div className="p-2 bg-red-100 text-red-700 rounded">{userError}</div>
            )}
            {userMsg && (
              <div className="p-2 bg-green-100 text-green-700 rounded">
                {userMsg}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Name (Optional)</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Department (Optional)</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  placeholder="Computer Science"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Email</label>
                <input
                  type="email"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="newuser@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Password</label>
                <input
                  type="password"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateUser}
                  disabled={userLoading}
                  className="inline-flex items-center px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {userLoading ? "Creating…" : "Create User"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setUserError("");
                    setUserMsg("");
                    setNewName("");
                    setNewDepartment("");
                    setNewEmail("");
                    setNewPassword("");
                  }}
                  className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

