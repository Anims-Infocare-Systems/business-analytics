import { useEffect, useState } from "react";
import "./Welcome.css";

export default function Welcome({ userName, companyName, onNavigate, userRights = {}, isSuperAdmin = false }) {
  const [greeting, setGreeting] = useState("Welcome");

  useEffect(() => {
    const hr = new Date().getHours();
    if (hr < 12) setGreeting("Good morning");
    else if (hr < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const cards = [
    {
      title: "Management Dashboard",
      desc: "Analyze overall performance, sales projections, purchase values, and quality metrics at a glance.",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
      target: "Top Management Dashboard",
      colorClass: "w-card--blue"
    },
    {
      title: "Approval Workflows",
      desc: "Manage and approve pending material approvals (E-Approval) and tool/development approvals (T-Approval).",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      target: "E-Approval",
      colorClass: "w-card--emerald"
    },
    {
      title: "Reports & Analysis",
      desc: "Deep dive into sales charts, vendor rejection details, purchase summaries, and production analysis.",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
      target: "Sales Analysis",
      colorClass: "w-card--amber"
    },
    {
      title: "System Settings",
      desc: "Configure your user profile details, update account passwords, or renew/upgrade your subscription plan.",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
      target: "Settings",
      colorClass: "w-card--slate"
    }
  ];

  const hasAccess = (target) => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const planId = (user.plan_id || "free").toLowerCase().trim();
    if (planId === "pro") {
      if (target === "Sales Analysis") return false;
    }
    if (isSuperAdmin) return true;
    if (target === "Top Management Dashboard") return !!userRights?.["Dashboard"];
    if (target === "E-Approval") return !!userRights?.["Approvals"];
    if (target === "Sales Analysis") return !!userRights?.["Reports"];
    if (target === "Settings") return true;
    return false;
  };

  const allowedCards = cards.filter(card => hasAccess(card.target));

  return (
    <div className="w-container">
      {/* ── Header Greeting ── */}
      <div className="w-header-section">
        <div className="w-avatar-container">
          <div className="w-avatar-ring">
            <div className="w-avatar">{(userName.slice(0, 2) || "US").toUpperCase()}</div>
          </div>
        </div>
        <div className="w-greeting-box">
          <h2 className="w-greeting-title">{greeting}, {userName}!</h2>
          <p className="w-greeting-subtitle">Welcome to your secure Business Analytics workspace.</p>
        </div>
      </div>

      {/* ── Status Card ── */}
      <div className="w-status-card">
        <div className="w-status-info">
          <span className="w-status-badge">
            <span className="w-status-dot" /> Live ERP Connection
          </span>
          <h3 className="w-status-company">{companyName}</h3>
          <p className="w-status-desc">All system databases and visual metrics are loaded and up to date.</p>
        </div>
        <div className="w-status-right">
          <div className="w-status-stat">
            <span className="w-status-stat-label">Active Modules</span>
            <span className="w-status-stat-val">12</span>
          </div>
          <div className="w-status-stat">
            <span className="w-status-stat-label">Current Date</span>
            <span className="w-status-stat-val">
              {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </div>
      </div>

      {/* ── Section Title ── */}
      <div className="w-section-divider">
        <span className="w-section-label">SELECT WORKSPACE ROUTE</span>
        <div className="w-line" />
      </div>

      {/* ── Shortcuts Grid ── */}
      <div className="w-grid">
        {allowedCards.map((card, idx) => (
          <div
            key={card.title}
            className={`w-card ${card.colorClass}`}
            style={{ "--idx": idx }}
            onClick={() => onNavigate(card.target)}
          >
            <div className="w-card__icon">{card.icon}</div>
            <h4 className="w-card__title">{card.title}</h4>
            <p className="w-card__desc">{card.desc}</p>
            <div className="w-card__action">
              <span>Open Workspace</span>
              <svg className="w-card__arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
