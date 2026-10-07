"use client";

import { useEffect, useState } from "react";
import { createDepartment, createUser, DepartmentOption, listAdminDepartments, listUsers, updateUserDepartment, deleteUser } from "@/lib/api";
import { InlineLoadingState } from "@/components/DashboardLoading";
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
type UserFilter = "student" | "professor" | "admin";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function userHasDepartment(user: UserRow, departmentCode: string): boolean {
  return (user.department || "")
    .split(/[,;/|]+/)
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean)
    .includes(departmentCode.toUpperCase());
}

function departmentLabels(user: UserRow): string[] {
  return (user.department_name || user.department || "")
    .split(/[,;/|]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

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
                  <InlineLoadingState text="Loading users..." />
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
                    <td className="min-w-[280px] px-5 py-3.5">
                      {u.role === "admin" ? (
                        <span className="text-xs font-semibold text-violet-300">Admin</span>
                      ) : u.role === "student" ? (
                        <select
                          value={u.department || ""}
                          onChange={(e) => onDepartmentChange(u, e.target.value || null)}
                          className="w-full max-w-[220px] rounded-lg border border-cyan-500/30 bg-slate-800 px-2.5 py-2 text-xs text-slate-200 focus:border-cyan-500/50 focus:outline-none"
                          aria-label={"Change department for " + displayName}
                        >
                          <option value="">Unassigned</option>
                          {departments.map((department) => (
                            <option key={department.code} value={department.code}>
                              {department.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex min-w-0 flex-wrap gap-1">
                            {departmentLabels(u).length ? departmentLabels(u).map((label) => (
                              <span key={label} className="rounded-md border border-blue-400/20 bg-blue-500/10 px-2 py-1 text-[11px] font-medium text-blue-200">
                                {label}
                              </span>
                            )) : <span className="text-xs text-slate-500">Unassigned</span>}
                          </div>
                          <select
                            value=""
                            onChange={(e) => onDepartmentChange(u, e.target.value || null)}
                            className="shrink-0 rounded-lg border border-cyan-500/30 bg-slate-800 px-2.5 py-2 text-xs text-slate-200 focus:border-cyan-500/50 focus:outline-none"
                            aria-label={(u.department ? "Add department for " : "Assign department to ") + displayName}
                          >
                            <option value="" disabled>{u.department ? "Add department" : "Assign department"}</option>
                            {departments
                              .filter((department) => !userHasDepartment(u, department.code))
                              .map((department) => (
                                <option key={department.code} value={department.code}>
                                  {department.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}
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
  const [roleFilter, setRoleFilter] = useState<UserFilter>("student");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
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
    const q = searchQuery.toLowerCase();
    const visible = users
      .filter((u) => u.role === roleFilter)
      .filter((u) => (
        departmentFilter === "all" ||
        (departmentFilter === "unassigned" ? u.role !== "admin" && !u.department : userHasDepartment(u, departmentFilter))
      ))
      .filter((u) => (
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.department_name?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      ))
      .sort((a, b) => (
        (a.department || "ZZZ").localeCompare(b.department || "ZZZ") ||
        (a.name || a.email).localeCompare(b.name || b.email)
      ));
    setFilteredUsers(visible);
  }, [departmentFilter, roleFilter, searchQuery, users]);

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
    const email = newEmail.trim().toLowerCase();
    if (!email || !newPassword) { setUserError("Email and password are required."); return; }
    if (!EMAIL_PATTERN.test(email)) {
      setUserError("Enter a valid email address, for example: user@gmail.com.");
      return;
    }
    const adminId = Number(localStorage.getItem("user_id") || 0);
    if (!adminId) { setUserError("Admin session expired."); return; }
    setUserError(""); setUserMsg(""); setUserLoading(true);
    try {
      await createUser(adminId, email, newPassword, newRole, newName || undefined, newDepartment || undefined);
      setUserMsg(`User "${email}" created.`);
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

  const closeCreateForm = () => {
    setShowCreateForm(false);
    setUserError("");
    setUserMsg("");
    setNewName("");
    setNewDepartment("");
    setNewEmail("");
    setNewPassword("");
  };

  const closeDepartmentForm = () => {
    setShowDepartmentForm(false);
    setDepartmentCode("");
    setDepartmentName("");
    setUserError("");
    setUserMsg("");
  };

  const inputCls = "w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30";
  const roleTabs: Array<{ key: UserFilter; label: string }> = [
    { key: "student", label: "Students" },
    { key: "professor", label: "Faculty" },
    { key: "admin", label: "Administrators" },
  ];

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
              onClick={() => {
                setUserError("");
                setUserMsg("");
                setShowCreateForm(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-violet-500"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add User
            </button>
          </div>

          {/* Search and department filter */}
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
            <div className="relative flex-1">
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
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2.5 text-xs text-slate-200 focus:border-cyan-500/50 focus:outline-none lg:w-56"
              aria-label="Filter users by department"
            >
              <option value="all">All departments</option>
              {departments.map((department) => (
                <option key={department.code} value={department.code}>{department.name}</option>
              ))}
              <option value="unassigned">Unassigned</option>
            </select>
          </div>

          <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-1.5 backdrop-blur-xl">
            <div className="flex flex-wrap gap-1">
              {roleTabs.map((tab) => {
                const count = users.filter((user) => user.role === tab.key).length;
                const active = roleFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setRoleFilter(tab.key)}
                    className={"rounded-xl px-4 py-2.5 text-xs font-semibold transition " + (
                      active
                        ? "bg-blue-600/20 text-white shadow-sm"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {tab.label}
                    <span className={"ml-2 rounded-full px-1.5 py-0.5 text-[10px] " + (
                      active ? "bg-blue-500/20 text-blue-200" : "bg-white/5 text-slate-500"
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Compact department summary */}
          <section className="rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3 backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Departments</h3>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {departments.length} configured · Select a department to filter the list
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUserError("");
                  setUserMsg("");
                  setShowDepartmentForm(true);
                }}
                className="self-start rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/20 sm:self-auto"
              >
                Manage departments
              </button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5">
              {departments.map((department) => {
                const active = departmentFilter === department.code;
                return (
                  <button
                    key={department.code}
                    type="button"
                    onClick={() => setDepartmentFilter(active ? "all" : department.code)}
                    className={"shrink-0 rounded-xl border px-3 py-2 text-left transition " + (
                      active
                        ? "border-cyan-400/40 bg-cyan-500/10"
                        : "border-white/10 bg-slate-950/30 hover:border-white/20 hover:bg-white/5"
                    )}
                  >
                    <span className="block text-xs font-semibold text-white">{department.name}</span>
                    <span className="mt-0.5 block text-[10px] text-slate-500">
                      {department.student_count ?? 0} students · {department.professor_count ?? 0} faculty · {department.course_count ?? 0} classes
                    </span>
                  </button>
                );
              })}
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
            <div
              className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 pt-8 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-user-title"
            >
              <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0b1227] p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h3 id="create-user-title" className="text-base font-semibold text-white">Create New User</h3>
                  <button
                    type="button"
                    aria-label="Close create user modal"
                    onClick={closeCreateForm}
                    className="rounded-lg px-2.5 py-1 text-xl leading-none text-slate-400 transition hover:bg-white/5 hover:text-white"
                  >
                    ×
                  </button>
                </div>

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
                  {newRole === "admin" ? (
                    <div className={inputCls + " text-violet-300"}>Admin (no department)</div>
                  ) : (
                    <select className={inputCls} value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)}>
                      <option value="">Unassigned</option>
                      {departments.map((department) => (
                        <option key={department.code} value={department.code}>{department.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Email</label>
                  <input type="email" inputMode="email" autoComplete="email" className={inputCls} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@gmail.com" aria-describedby="create-user-email-help" />
                  <p id="create-user-email-help" className="mt-1.5 text-[11px] text-slate-500">Use a valid address, for example user@gmail.com.</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Role</label>
                  <select className={inputCls} value={newRole} onChange={(e) => {
                    const role = e.target.value as UserRole;
                    setNewRole(role);
                    if (role === "admin") setNewDepartment("");
                  }}>
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
                  onClick={closeCreateForm}
                  className="rounded-xl border border-white/10 bg-slate-800/60 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
              </div>
            </div>
          )}

          {/* Department management modal */}
          {showDepartmentForm && (
            <div
              className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 pt-8 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="department-management-title"
            >
              <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b1227] p-5 shadow-2xl">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 id="department-management-title" className="text-base font-semibold text-white">Manage Departments</h3>
                    <p className="mt-1 text-xs text-slate-400">Create departments for users and classes.</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Close department management modal"
                    onClick={closeDepartmentForm}
                    className="rounded-lg px-2.5 py-1 text-xl leading-none text-slate-400 transition hover:bg-white/5 hover:text-white"
                  >
                    ×
                  </button>
                </div>

                {userError && (
                  <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{userError}</div>
                )}
                {userMsg && (
                  <div className="mb-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2.5 text-sm text-cyan-300">{userMsg}</div>
                )}

                <div className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)_auto]">
                  <input
                    value={departmentCode}
                    onChange={(e) => setDepartmentCode(e.target.value.toUpperCase())}
                    placeholder="Code"
                    className={inputCls}
                    maxLength={24}
                    aria-label="Department code"
                  />
                  <input
                    value={departmentName}
                    onChange={(e) => setDepartmentName(e.target.value)}
                    placeholder="Department name"
                    className={inputCls}
                    aria-label="Department name"
                  />
                  <button
                    type="button"
                    onClick={handleCreateDepartment}
                    disabled={userLoading}
                    className="rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-40"
                  >
                    {userLoading ? "Adding…" : "Add"}
                  </button>
                </div>

                <div className="mt-5 rounded-xl border border-white/5 bg-slate-950/30 p-3">
                  <p className="text-xs font-semibold text-slate-300">Current departments</p>
                  <div className="mt-2 space-y-2">
                    {departments.length === 0 ? (
                      <p className="text-xs text-slate-500">No departments created yet.</p>
                    ) : (
                      departments.map((department) => (
                        <div key={department.code} className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-white">{department.name}</p>
                            <p className="text-[10px] text-slate-500">{department.code}</p>
                          </div>
                          <p className="shrink-0 text-[10px] text-slate-500">
                            {department.student_count ?? 0} students · {department.professor_count ?? 0} faculty
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={closeDepartmentForm}
                    className="rounded-xl border border-white/10 bg-slate-800/60 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-slate-800"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
