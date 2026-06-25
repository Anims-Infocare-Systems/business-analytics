#!/usr/bin/env python3
"""
Complete rewrite of both side panels to match DashboardLayout sidebar collapse exactly.
- Expanded: shows full panel header + scrollable card list + collapse button at bottom
- Collapsed: 44px wide, shows only the section icon centered + expand button at bottom
- The collapse button at bottom mirrors DashboardLayout's collapse btn style
"""

filepath = r"Frontend\src\assets\Pages\plantperformance1.jsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# ─────────────────────────────────────────────────────────────────────────────
# 1.  LEFT PANEL — "Current Status"
#     Find the section open tag and replace the entire section head + kpi-list open
# ─────────────────────────────────────────────────────────────────────────────

old_left = '''          <section className={`pp1-panel pp1-panel--left${leftPanelCollapsed ? " pp1-panel--side-collapsed" : ""}`}>
            {/* ── Collapsed vertical rail ── */}
            {leftPanelCollapsed && (
              <div className="pp1-panel__rail pp1-panel__rail--left" onClick={() => setLeftPanelCollapsed(false)} title="Expand Current Status">
                <ClipboardList size={15} style={{ color: "var(--pp1-blue)", flexShrink: 0 }} />
                <span className="pp1-panel__rail-label">Current Status</span>
                <ChevronRight size={13} style={{ color: "#2563eb", opacity: 0.7, marginTop: "auto" }} />
              </div>
            )}
            {/* ── Normal panel content ── */}
            {!leftPanelCollapsed && (
              <>
                <div className="pp1-panel__head pp1-panel__head--collapsible" onClick={() => setLeftPanelCollapsed(true)}>
                  <div className="pp1-panel__header">
                    <span
                      className="pp1-panel__collapse-icon pp1-panel__collapse-icon--blue"
                      title="Collapse"
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === "Enter" && setLeftPanelCollapsed(true)}
                    >
                      <ChevronLeft size={13} />
                    </span>
                    <ClipboardList size={16} style={{ color: "var(--pp1-blue)", flexShrink: 0 }} />
                    <h2 className="pp1-panel__title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      Current Status
                      <span style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        color: "#2563eb",
                        background: "rgba(37, 99, 235, 0.08)",
                        border: "1px solid rgba(37, 99, 235, 0.16)",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        lineHeight: 1.2
                      }}>
                        {ACTION_CARDS.filter(a => !getCardStatus(a.id).belowTarget).length}
                      </span>
                    </h2>
                  </div>
                  <p className="pp1-panel__hint">Click a card to explore details</p>
                </div>
                <div className="pp1-kpi-list">'''

new_left = '''          <section className={`pp1-panel pp1-panel--left${leftPanelCollapsed ? " pp1-panel--dl-collapsed" : ""}`}>
            {/* ── Collapsed state: icon only centered (DashboardLayout style) ── */}
            {leftPanelCollapsed && (
              <div className="pp1-dl-rail pp1-dl-rail--left">
                <div className="pp1-dl-rail__icon-wrap" title="Current Status">
                  <ClipboardList size={18} style={{ color: "var(--pp1-blue)" }} />
                </div>
                <button
                  className="pp1-dl-rail__expand-btn pp1-dl-rail__expand-btn--blue"
                  onClick={() => setLeftPanelCollapsed(false)}
                  title="Expand Current Status"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
            {/* ── Expanded state ── */}
            {!leftPanelCollapsed && (
              <>
                <div className="pp1-panel__head">
                  <div className="pp1-panel__header">
                    <ClipboardList size={16} style={{ color: "var(--pp1-blue)", flexShrink: 0 }} />
                    <h2 className="pp1-panel__title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      Current Status
                      <span style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        color: "#2563eb",
                        background: "rgba(37, 99, 235, 0.08)",
                        border: "1px solid rgba(37, 99, 235, 0.16)",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        lineHeight: 1.2
                      }}>
                        {ACTION_CARDS.filter(a => !getCardStatus(a.id).belowTarget).length}
                      </span>
                    </h2>
                  </div>
                  <p className="pp1-panel__hint">Click a card to explore details</p>
                </div>
                <div className="pp1-kpi-list">'''

# ─────────────────────────────────────────────────────────────────────────────
# 2.  LEFT PANEL CLOSING — add collapse button before </> and </section>
#     Old closing (after fix_panel_close.py ran):
# ─────────────────────────────────────────────────────────────────────────────

old_left_close = '''                </div>
              </>
            )}
          </section>

          <section className="pp1-center"'''

new_left_close = '''                </div>
                {/* ── Collapse button at bottom (DashboardLayout style) ── */}
                <button
                  className="pp1-dl-collapse-btn pp1-dl-collapse-btn--left"
                  onClick={() => setLeftPanelCollapsed(true)}
                  title="Collapse Current Status"
                >
                  <ChevronLeft size={16} />
                  <span className="pp1-dl-collapse-label">Collapse</span>
                </button>
              </>
            )}
          </section>

          <section className="pp1-center"'''

# ─────────────────────────────────────────────────────────────────────────────
# 3.  RIGHT PANEL — "Action to be Taken"
# ─────────────────────────────────────────────────────────────────────────────

old_right = '''          <section className={`pp1-panel pp1-panel--right${rightPanelCollapsed ? " pp1-panel--side-collapsed" : ""}`}>
            {/* ── Collapsed vertical rail ── */}
            {rightPanelCollapsed && (
              <div className="pp1-panel__rail pp1-panel__rail--right" onClick={() => setRightPanelCollapsed(false)} title="Expand Action to be Taken">
                <ChevronLeft size={13} style={{ color: "#f59e0b", opacity: 0.7 }} />
                <span className="pp1-panel__rail-label">Action to be Taken</span>
                <ListTodo size={15} style={{ color: "var(--pp1-amber)", flexShrink: 0, marginTop: "auto" }} />
              </div>
            )}
            {/* ── Normal panel content ── */}
            {!rightPanelCollapsed && (
              <>
                <div className="pp1-panel__head pp1-panel__head--collapsible" onClick={() => setRightPanelCollapsed(true)}>
                  <div className="pp1-panel__header">
                    <ListTodo size={16} style={{ color: "var(--pp1-amber)", flexShrink: 0 }} />
                    <h2 className="pp1-panel__title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      Action to be Taken
                      <span style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        color: "#ef4444",
                        background: "rgba(239, 68, 68, 0.08)",
                        border: "1px solid rgba(239, 68, 68, 0.16)",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        lineHeight: 1.2
                      }}>
                        {actionItems.length}
                      </span>
                    </h2>
                    <span
                      className="pp1-panel__collapse-icon pp1-panel__collapse-icon--amber"
                      title="Collapse"
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === "Enter" && setRightPanelCollapsed(true)}
                    >
                      <ChevronRight size={13} />
                    </span>
                  </div>
                  <p className="pp1-panel__hint">List of pending actions</p>
                </div>
                <div className="pp1-action-list">'''

new_right = '''          <section className={`pp1-panel pp1-panel--right${rightPanelCollapsed ? " pp1-panel--dl-collapsed" : ""}`}>
            {/* ── Collapsed state: icon only centered (DashboardLayout style) ── */}
            {rightPanelCollapsed && (
              <div className="pp1-dl-rail pp1-dl-rail--right">
                <div className="pp1-dl-rail__icon-wrap" title="Action to be Taken">
                  <ListTodo size={18} style={{ color: "var(--pp1-amber)" }} />
                </div>
                <button
                  className="pp1-dl-rail__expand-btn pp1-dl-rail__expand-btn--amber"
                  onClick={() => setRightPanelCollapsed(false)}
                  title="Expand Action to be Taken"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
            )}
            {/* ── Expanded state ── */}
            {!rightPanelCollapsed && (
              <>
                <div className="pp1-panel__head">
                  <div className="pp1-panel__header">
                    <ListTodo size={16} style={{ color: "var(--pp1-amber)", flexShrink: 0 }} />
                    <h2 className="pp1-panel__title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      Action to be Taken
                      <span style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        color: "#ef4444",
                        background: "rgba(239, 68, 68, 0.08)",
                        border: "1px solid rgba(239, 68, 68, 0.16)",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        lineHeight: 1.2
                      }}>
                        {actionItems.length}
                      </span>
                    </h2>
                  </div>
                  <p className="pp1-panel__hint">List of pending actions</p>
                </div>
                <div className="pp1-action-list">'''

old_right_close = '''                </div>
              </>
            )}
          </section>
        </div>

        {selectionId === "customer_po_vs_sales_analysis"'''

new_right_close = '''                </div>
                {/* ── Collapse button at bottom (DashboardLayout style) ── */}
                <button
                  className="pp1-dl-collapse-btn pp1-dl-collapse-btn--right"
                  onClick={() => setRightPanelCollapsed(true)}
                  title="Collapse Action to be Taken"
                >
                  <ChevronRight size={16} />
                  <span className="pp1-dl-collapse-label">Collapse</span>
                </button>
              </>
            )}
          </section>
        </div>

        {selectionId === "customer_po_vs_sales_analysis"'''

# ─────────────────────────────────────────────────────────────────────────────
# Apply all replacements (normalise to LF)
# ─────────────────────────────────────────────────────────────────────────────
content = content.replace('\r\n', '\n')

changes = 0
for old, new, label in [
    (old_left,        new_left,        "LEFT panel head"),
    (old_left_close,  new_left_close,  "LEFT panel close"),
    (old_right,       new_right,       "RIGHT panel head"),
    (old_right_close, new_right_close, "RIGHT panel close"),
]:
    if old in content:
        content = content.replace(old, new, 1)
        print(f"SUCCESS: {label} replaced")
        changes += 1
    else:
        print(f"ERROR:   {label} NOT found")
        # Hint: find the nearest anchor
        anchors = {
            "LEFT panel head":  "pp1-panel--side-collapsed",
            "LEFT panel close": "pp1-dl-rail--left",
            "RIGHT panel head": "pp1-panel--right",
            "RIGHT panel close": "customer_po_vs_sales_analysis",
        }
        anchor = anchors.get(label, "")
        idx = content.find(anchor)
        if idx != -1:
            print(f"  Anchor '{anchor}' found at {idx}")
            print(repr(content[max(0,idx-200):idx+400]))

if changes:
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"\nFile saved with {changes}/4 changes.")
else:
    print("\nNo changes saved.")
