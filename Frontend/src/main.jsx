import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";

// ─── PWA Service Worker Registration ──────────────────────────────────────────
import { registerSW } from "virtual:pwa-register";

// ══════════════════════════════════════════════════════════════════════════════
//  Toast utility  (used for SW updates, offline, install — all same style)
// ══════════════════════════════════════════════════════════════════════════════
function showToast({ message, sub, actionLabel, onAction, duration = 0, type = "info" }) {
  const palette = {
    info:    { border: "#6c63ff", icon: "🔔" },
    install: { border: "#6c63ff", icon: "📲" },
    success: { border: "#00d97e", icon: "✅" },
    warning: { border: "#f59e0b", icon: "📶" },
    ios:     { border: "#6c63ff", icon: "📲" },
  };
  const p = palette[type] || palette.info;

  // ── Remove any existing install toast so they don't stack ──
  if (type === "install" || type === "ios") {
    document.getElementById("pwa-install-toast")?.remove();
  }

  const el = document.createElement("div");
  if (type === "install" || type === "ios") el.id = "pwa-install-toast";
  el.setAttribute("role", "alert");
  el.setAttribute("aria-live", "polite");

  Object.assign(el.style, {
    position:       "fixed",
    bottom:         "24px",
    left:           "50%",
    transform:      "translateX(-50%) translateY(18px)",
    opacity:        "0",
    transition:     "opacity .32s ease, transform .32s ease",
    zIndex:         "999999",
    background:     "rgba(14,11,40,0.97)",
    border:         `1px solid ${p.border}`,
    borderRadius:   "14px",
    padding:        "11px 14px",
    display:        "flex",
    alignItems:     "center",
    gap:            "10px",
    maxWidth:       "360px",
    width:          "calc(100vw - 40px)",
    boxShadow:      `0 6px 30px rgba(0,0,0,0.45), 0 0 0 1px rgba(108,99,255,0.08)`,
    fontFamily:     "'Inter','Segoe UI',system-ui,sans-serif",
    color:          "#e2e8f0",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
  });

  // Icon
  const iconEl = document.createElement("span");
  iconEl.textContent = p.icon;
  Object.assign(iconEl.style, { fontSize: "16px", flexShrink: "0" });

  // Text block
  const textWrap = document.createElement("div");
  Object.assign(textWrap.style, { flex: "1", minWidth: "0" });

  const msgEl = document.createElement("div");
  msgEl.textContent = message;
  Object.assign(msgEl.style, {
    fontSize: "13px", fontWeight: "600", color: "#f1f5f9",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  });
  textWrap.appendChild(msgEl);

  if (sub) {
    const subEl = document.createElement("div");
    subEl.textContent = sub;
    Object.assign(subEl.style, {
      fontSize: "11px", color: "#94a3b8", marginTop: "2px",
      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    });
    textWrap.appendChild(subEl);
  }

  // Action button
  if (actionLabel && onAction) {
    const btn = document.createElement("button");
    btn.textContent = actionLabel;
    Object.assign(btn.style, {
      background:    "linear-gradient(135deg,#6c63ff,#9b59f5)",
      border:        "none",
      borderRadius:  "8px",
      color:         "#fff",
      cursor:        "pointer",
      fontSize:      "12px",
      fontWeight:    "700",
      padding:       "6px 14px",
      flexShrink:    "0",
      whiteSpace:    "nowrap",
      boxShadow:     "0 2px 10px rgba(108,99,255,0.35)",
      transition:    "opacity .15s",
      letterSpacing: "0.2px",
    });
    btn.onmouseenter = () => (btn.style.opacity = ".82");
    btn.onmouseleave = () => (btn.style.opacity = "1");
    btn.onclick = () => { dismiss(); onAction(); };
    el.appendChild(iconEl);
    el.appendChild(textWrap);
    el.appendChild(btn);
  } else {
    el.appendChild(iconEl);
    el.appendChild(textWrap);
  }

  // Close ✕
  const x = document.createElement("button");
  x.textContent = "✕";
  x.setAttribute("aria-label", "Dismiss");
  Object.assign(x.style, {
    background: "none", border: "none", color: "#64748b",
    cursor: "pointer", fontSize: "13px", padding: "0 2px",
    lineHeight: "1", flexShrink: "0",
  });
  x.onclick = () => { markDismissed(); dismiss(); };
  el.appendChild(x);

  document.body.appendChild(el);

  // Animate in
  requestAnimationFrame(() => {
    el.style.opacity   = "1";
    el.style.transform = "translateX(-50%) translateY(0)";
  });

  function dismiss() {
    el.style.opacity   = "0";
    el.style.transform = "translateX(-50%) translateY(18px)";
    setTimeout(() => el.remove(), 350);
  }

  if (duration > 0) setTimeout(dismiss, duration);
  return dismiss;
}

// ══════════════════════════════════════════════════════════════════════════════
//  Install prompt helpers
// ══════════════════════════════════════════════════════════════════════════════
const DISMISSED_KEY = "pwa_install_dismissed_v1";

const isIos        = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;
const wasDismissed = () =>
  Date.now() - parseInt(localStorage.getItem(DISMISSED_KEY) || "0", 10) < 1 * 24 * 60 * 60 * 1000;
const markDismissed = () =>
  localStorage.setItem(DISMISSED_KEY, String(Date.now()));

const isLoginPage = () => {
  const path = window.location.pathname;
  return path === "/" || path === "/index.html" || path === "/login" || path === "/AnimsBusinessAnalytics/";
};

// ── Android / Desktop — toast-style install prompt ────────────────────────────
let deferredPrompt = null;

function showAndroidInstallToast() {
  if (wasDismissed() || !isLoginPage()) return;

  showToast({
    message:     "Install Anims BA",
    sub:         "Add to home screen for the best experience",
    actionLabel: "Install",
    onAction:    async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (outcome === "accepted") {
        showToast({ message: "App installed! 🎉", type: "success", duration: 4000 });
      }
    },
    duration: 8000,   // auto-dismiss after 8 s
    type:     "install",
  });
}

// ── iOS Safari — toast with step hint ────────────────────────────────────────
function showIosInstallToast() {
  if (isStandalone() || wasDismissed() || !isLoginPage()) return;

  showToast({
    message:  "Add to Home Screen",
    sub:      "Tap ⬆ Share → \"Add to Home Screen\"",
    duration: 10000,  // auto-dismiss after 10 s
    type:     "ios",
  });
}

// ── Wire events ───────────────────────────────────────────────────────────────
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  setTimeout(showAndroidInstallToast, 2500);
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  document.getElementById("pwa-install-toast")?.remove();
  showToast({ message: "Anims BA installed! 🎉", type: "success", duration: 5000 });
});

if (isIos() && !isStandalone()) {
  setTimeout(showIosInstallToast, 3500);
}

// ── URL Change Listener to dismiss PWA Toast outside Login ────────────────────
const dismissPwaToastOutsideLogin = () => {
  if (!isLoginPage()) {
    document.getElementById("pwa-install-toast")?.remove();
  }
};
window.addEventListener("popstate", dismissPwaToastOutsideLogin);
const originalPushState = window.history.pushState;
window.history.pushState = function(...args) {
  originalPushState.apply(this, args);
  dismissPwaToastOutsideLogin();
};
const originalReplaceState = window.history.replaceState;
window.history.replaceState = function(...args) {
  originalReplaceState.apply(this, args);
  dismissPwaToastOutsideLogin();
};

// ══════════════════════════════════════════════════════════════════════════════
//  Register Service Worker
// ══════════════════════════════════════════════════════════════════════════════
const updateSW = registerSW({
  onNeedRefresh() {
    showToast({
      message:     "New version available!",
      actionLabel: "Update",
      onAction:    () => updateSW(true),
      type:        "info",
    });
  },
  onOfflineReady() {
    showToast({ message: "Ready to work offline ✓", type: "success", duration: 4000 });
  },
  onRegisterError(err) {
    console.warn("[PWA] SW registration failed:", err);
  },
});

// ══════════════════════════════════════════════════════════════════════════════
//  Online / Offline banners
// ══════════════════════════════════════════════════════════════════════════════
let offlineRemove = null;

window.addEventListener("offline", () => {
  offlineRemove = showToast({
    message: "You're offline — cached data in use.",
    type:    "warning",
  });
});

window.addEventListener("online", () => {
  if (offlineRemove) { offlineRemove(); offlineRemove = null; }
  showToast({ message: "Back online!", type: "success", duration: 3000 });
});

// ══════════════════════════════════════════════════════════════════════════════
//  Global fetch interceptor — 401 session expiry
// ══════════════════════════════════════════════════════════════════════════════
const _fetch = window.fetch;
window.fetch = async (...args) => {
  const res = await _fetch(...args);
  if (res.status === 401) {
    const url = typeof args[0] === "string" ? args[0] : (args[0]?.url ?? "");
    if (!url.includes("/login/") && !url.includes("/forgot-password/")) {
      try {
        localStorage.removeItem("user");
        localStorage.removeItem("ba_user_rights");
        localStorage.removeItem("ba_settings_profile");
        sessionStorage.clear();
      } catch (e) {
        console.error("Storage clear failed:", e);
      }
      window.location.href = "/";
    }
  }
  return res;
};

// ══════════════════════════════════════════════════════════════════════════════
//  React root
// ══════════════════════════════════════════════════════════════════════════════
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
