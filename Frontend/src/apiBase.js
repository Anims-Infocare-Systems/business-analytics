/**
 * Resolved once at build-time. Matches Django `urlpatterns`: path('api/', include(...)).
 * - Omit env → `/api` (Vite dev server proxies to Django).
 * - If env is bare origin `http://host:8000`, append `/api` automatically.
 */
export function resolveApiBase() {
  const raw = typeof import.meta.env.VITE_API_BASE_URL === "string" ? import.meta.env.VITE_API_BASE_URL.trim() : "";
  if (!raw) return "/api";
  if (raw.startsWith("/")) return raw.replace(/\/+$/, "") || "/api";
  try {
    const u = new URL(raw);
    const path = u.pathname.replace(/\/+$/, "") || "";
    if (!path || path === "/") u.pathname = "/api";
    return u.href.replace(/\/+$/, "");
  } catch {
    return raw.replace(/\/+$/, "");
  }
}
