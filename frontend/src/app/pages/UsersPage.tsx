"use client";

import { useEffect, useState } from "react";
import { createUser, listUsers, deleteUser } from "@/lib/api";
import Loader from "@/components/Loader";

export type UserRow = {
  id: number;
  name: string | null;
  department?: string | null;
  email: string;
  role: string;
};

export type UserRole = "admin" | "professor" | "student";

const roleBadge: Record<string, string> = {
  admin: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  professor: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  student: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
};

function UserTable({
  users, loading, onDelete,
}: {
  users: UserRow[];
  loading: boolean;
  onDelete: (u: UserRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-white/5 bg-slate-800/50">
              {["Name", "Department", "Email", "Role", "Actions"].map((h, i) => (
                <th
                  key={h}
                  className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400 ${i === 4 ? "text-right" : "text-left"}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <Loader fullScreen text="Loading..." />
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-14 text-center text-sm text-slate-500">No users found.</td>
              </tr>
            ) : (
              users.map((u) => {
                const displayName =
                  u.name?.trim() ||
                  u.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) ||
                  "—";
                return (
                  <tr key={u.id} className="border-b border-white/5 transition hover:bg-slate-800/40">
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-200">{displayName}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-400">{u.department?.trim() || "—"}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-400">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${roleBadge[u.role] ?? "bg-slate-700 text-slate-300"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {u.role !== "admin" && (
                        <button
                          type="button"
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
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
  const [newRole, setNewRole] = useState<UserRole>("student");
  const [userMsg, setUserMsg] = useState("");
  const [userError, setUserError] = useState("");
  const [userLoading, setUserLoading] = useState(false);

  useEffect(() => {
    const adminId = Number(localStorage.getItem("user_id") || 0);
    if (!adminId) return;
    (async () => {
      setUsersLoading(true); setUserError("");
      try {
        const data = await listUsers(adminId);
        setUsers(data); setFilteredUsers(data);
      } catch (err: any) { setUserError(err.message || "Failed to load users"); }
      finally { setUsersLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setFilteredUsers(users); return; }
    const q = searchQuery.toLowerCase();
    setFilteredUsers(users.filter((u) =>
      (u.name?.toLowerCase().includes(q) || false) ||
      (u.department?.toLowerCase().includes(q) || false) ||
      u.email.toLowerCase().includes(q)
    ));
  }, [searchQuery, users]);

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword) { setUserError("Email and password are required"); return; }
    const adminId = Number(localStorage.getItem("user_id") || 0);
    if (!adminId) { setUserError("Admin session expired."); return; }
    setUserError(""); setUserMsg(""); setUserLoading(true);
    try {
      await createUser(adminId, newEmail, newPassword, newRole, newName || undefined, newDepartment || undefined);
      setUserMsg(`User "${newEmail}" created.`);
      setNewName(""); setNewDepartment(""); setNewEmail(""); setNewPassword("");
      const data = await listUsers(adminId);
      setUsers(data); setFilteredUsers(data);
    } catch (err: any) { setUserError(err.message || "Failed to create user"); }
    finally { setUserLoading(false); }
  };

  const handleDelete = async (u: UserRow) => {
    const adminId = Number(localStorage.getItem("user_id") || 0);
    if (!adminId) { setUserError("Admin session expired."); return; }
    if (!confirm(`Delete user "${u.email}"?`)) return;
    try {
      setUserError("");
      await deleteUser(adminId, u.id);
      const updated = users.filter((usr) => usr.id !== u.id);
      setUsers(updated); setFilteredUsers(updated);
    } catch (err: any) { setUserError(err.message || "Failed to delete user"); }
  };

  const inputCls = "w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <p className="mt-1 text-sm text-slate-400">Manage platform users and their roles</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-violet-500"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
        </svg>
        <input
          type="text"
          className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 backdrop-blur-sm"
          placeholder="Search users by name, email or department…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {userError && !showCreateForm && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{userError}</div>
      )}

      <UserTable users={filteredUsers} loading={usersLoading} onDelete={handleDelete} />

      {/* Create form */}
      {showCreateForm && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm">
          <h3 className="mb-4 text-base font-semibold text-white">Create New User</h3>

          {userError && (
            <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{userError}</div>
          )}
          {userMsg && (
            <div className="mb-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2.5 text-sm text-cyan-300">{userMsg}</div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Name (Optional)</label>
              <input type="text" className={inputCls} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="John Doe" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Department (Optional)</label>
              <input type="text" className={inputCls} value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)} placeholder="Computer Science" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Email</label>
              <input type="email" className={inputCls} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Role</label>
              <select className={inputCls} value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)}>
                <option value="student">Student</option>
                <option value="professor">Professor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Password</label>
              <input type="password" className={inputCls} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              onClick={handleCreateUser}
              disabled={userLoading}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-violet-500 disabled:opacity-40"
            >
              {userLoading ? "Creating…" : "Create User"}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreateForm(false); setUserError(""); setUserMsg(""); setNewName(""); setNewDepartment(""); setNewEmail(""); setNewPassword(""); }}
              className="rounded-xl border border-white/10 bg-slate-800/60 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}