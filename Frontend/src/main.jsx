import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";

// ─── Global Fetch Interceptor for Session Expiry ───
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (response.status === 401) {
    const urlStr = typeof args[0] === "string" ? args[0] : (args[0] && args[0].url) || "";
    if (!urlStr.includes("/login/") && !urlStr.includes("/forgot-password/")) {
      try {
        localStorage.removeItem("user");
        localStorage.removeItem("ba_user_rights");
        localStorage.removeItem("ba_settings_profile");
        sessionStorage.clear();
      } catch (err) {
        console.error("Failed to clear storage on 401:", err);
      }
      window.location.href = "/";
    }
  }
  return response;
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
