export const ADMIN_TOKEN_KEY = "ap_admin_token";

export function getAdminToken() {
    try {
        return sessionStorage.getItem(ADMIN_TOKEN_KEY) || "";
    } catch {
        return "";
    }
}

export function setAdminToken(token) {
    try {
        if (token) sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
        else sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch {
        /* ignore */
    }
}

/** Admin API fetch — always sends session cookie + X-Admin-Token when available. */
export function adminFetch(input, init = {}) {
    const token = getAdminToken();
    const headers = new Headers(init.headers || {});
    if (token) headers.set("X-Admin-Token", token);
    if (init.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    return fetch(input, { ...init, credentials: "include", headers });
}
