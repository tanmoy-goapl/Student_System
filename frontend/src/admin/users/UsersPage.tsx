"use client";

import { useEffect, useState } from "react";
import { createDepartment, createUser, DepartmentOption, listAdminDepartments, listUsers, updateUserDepartment, deleteUser } from "@/lib/api";
import Loader from "@/components/Loader";
import AdminSidebar from "../components/AdminSidebar";

export type UserRow = {
  id: number;
  name: string | null;
  department?: string | null;
  department_name?: string | null;
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
  users, loading, departments, onDelete, onDepartmentChange,
}: {
  users: UserRow[];
  loading: boolean;
  departments: DepartmentOption[];
  onDelete: (u: UserRow) => void;
  onDepartmentChange: (u: UserRow, department: string | null) => void;
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
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                  </div>
                </td>
              </tr>
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
                    <td className="px-5 py-3.5">
                      <select
                        value={u.department || ""}
                        onChange={(e) => onDepartmentChange(u, e.target.value || null)}
                        className="rounded-lg border border-white/10 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500/50 focus:outline-none"
                        aria-label={"Department for " + displayName}
                      >
                        <option value="">Unassigned</option>
                        {u.department && !departments.some((department) => department.code === u.department) && (
                          <option value={u.department}>{u.department_name || u.department}</option>
                        )}
                        {departments.map((department) => (
                          <option key={department.code} value={department.code}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                    </td>
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
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [departmentCode, setDepartmentCode] = useState("");
  const [departmentName, setDepartmentName] = useState("");
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
        const [data, departmentRows] = await Promise.all([listUsers(adminId), listAdminDepartments(adminId)]);
        setUsers(data); setFilteredUsers(data);
        setDepartments(departmentRows);
      } catch (err: any) { setUserError(err.message || "Failed to load users"); }
      finally { setUsersLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setFilteredUsers(users); return; }
    const q = searchQuery.toLowerCase();
    setFilteredUsers(users.filter((u) =>
      (u.name?.toLowerCase().includes(q) || false) ||
      (u.department_name?.toLowerCase().includes(q) || false) ||
      (u.department?.toLowerCase().includes(q) || false) ||
      u.email.toLowerCase().includes(q)
    ));
  }, [searchQuery, users]);

  const handleDepartmentChange = async (user: UserRow, department: string | null) => {
    const adminId = Number(localStorage.getItem("user_id") || 0);
    if (!adminId) { setUserError("Admin session expired."); return; }
    try {
      const result = await updateUserDepartment(adminId, user.id, department);
      setUsers((current) => current.map((item) => item.id === user.id
        ? { ...item, department: result.department, department_name: result.department_name }
        : item
      ));
      setDepartments(await listAdminDepartments(adminId));
    } catch (err: any) {
      setUserError(err.message || "Failed to update department");
    }
  };

  const handleCreateDepartment = async () => {
    if (!departmentCode.trim() || !departmentName.trim()) {
      setUserError("Department code and name are required.");
      return;
    }
    const adminId = Number(localStorage.getItem("user_id") || 0);
    if (!adminId) { setUserError("Admin session expired."); return; }
    setUserError(""); setUserMsg(""); setUserLoading(true);
    try {
      const created = await createDepartment(adminId, departmentCode.trim(), departmentName.trim());
      setDepartments((current) => [...current.filter((item) => item.code !== created.code), created]);
      setNewDepartment(created.code);
      setDepartmentCode(""); setDepartmentName("");
      setUserMsg(created.name + " is now available for account and class assignment.");
    } catch (err: any) {
      setUserError(err.message || "Failed to create department");
    } finally {
      setUserLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword) { setUserError("Email and password are required"); return; }
    const adminId = Number(localStorage.getItem("user_id") || 0);
    if (!adminId) { setUserError("Admin session expired."); return; }
    setUserError(""); setUserMsg(""); setUserLoading(true);
    try {
      await createUser(adminId, newEmail, newPassword, newRole, newName || undefined, newDepartment || undefined);
      setUserMsg(`User "${newEmail}" created.`);
      setNewName(""); setNewDepartment(""); setNewEmail(""); setNewPassword("");
      const [data, departmentRows] = await Promise.all([listUsers(adminId), listAdminDepartments(adminId)]);
      setUsers(data); setFilteredUsers(data);
      setDepartments(departmentRows);
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
    <div className="h-screen bg-[#020617] flex overflow-hidden text-white font-sans">
      {/* Left Sidebar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Scrollable Body */}
        <main className="flex-1 overflow-y-auto purple-scrollbar p-6 space-y-6 bg-gradient-to-b from-[#040815] to-[#020617]">
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

          {/* Department management */}
          <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 backdrop-blur-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Departments</h3>
                <p className="mt-1 text-xs text-slate-400">Create departments and assign them to existing students or faculty below.</p>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-[120px_minmax(180px,1fr)_auto] lg:max-w-xl">
                <input
                  value={departmentCode}
                  onChange={(e) => setDepartmentCode(e.target.value.toUpperCase())}
                  placeholder="Code"
                  className={inputCls}
                  maxLength={24}
                />
                <input
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  placeholder="Department name"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={handleCreateDepartment}
                  disabled={userLoading}
                  className="rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-40"
                >
                  Add Department
                </button>
              </div>
            </div>
            {userMsg && <p className="mt-3 text-xs text-cyan-300">{userMsg}</p>}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {departments.map((department) => (
                <div key={department.code} className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
                  <p className="text-sm font-semibold text-white">{department.name}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{department.code}</p>
                  <p className="mt-3 text-[11px] text-slate-400">
                    {department.student_count ?? 0} students · {department.professor_count ?? 0} faculty · {department.course_count ?? 0} classes
                  </p>
                </div>
              ))}
            </div>
          </section>

          {userError && !showCreateForm && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{userError}</div>
          )}

          <UserTable
            users={filteredUsers}
            loading={usersLoading}
            departments={departments}
            onDelete={handleDelete}
            onDepartmentChange={handleDepartmentChange}
          />

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
                  <select className={inputCls} value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)}>
                    <option value="">Unassigned</option>
                    {departments.map((department) => (
                      <option key={department.code} value={department.code}>{department.name}</option>
                    ))}
                  </select>
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
        </main>
      </div>
    </div>
  );
}
