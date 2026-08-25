export function getAdminScopedEndpoint(endpoint: string): string {
  if (typeof window === "undefined") {
    throw new Error("Admin authentication is required.");
  }

  const adminId = window.localStorage.getItem("user_id");
  const role = window.localStorage.getItem("role");
  const parsedId = adminId ? Number(adminId) : NaN;

  if (role !== "admin" || !Number.isInteger(parsedId) || parsedId <= 0) {
    throw new Error("Admin authentication is required.");
  }

  const separator = endpoint.includes("?") ? "&" : "?";
  return endpoint + separator + "admin_id=" + encodeURIComponent(String(parsedId));
}
