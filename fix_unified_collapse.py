#!/usr/bin/env python3
"""
Unified panel collapse:
1. Replace leftPanelCollapsed + rightPanelCollapsed with single panelsCollapsed
2. Add small PanelLeftClose/PanelRightClose icon near panel titles
3. Clicking either icon collapses/expands BOTH panels
4. Remove old bottom Collapse buttons
"""
import re

filepath = r"Frontend\src\assets\Pages\plantperformance1.jsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('\r\n', '\n')

changes = []

# ── 1. Replace two separate state declarations with one ──────────────────────
old_states = (
    "  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);\n"
    "  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);"
)
new_states = "  const [panelsCollapsed, setPanelsCollapsed] = useState(false);"
if old_states in content:
    content = content.replace(old_states, new_states, 1)
    changes.append("1. State declarations merged")
else:
    changes.append("1. FAILED: State declarations not found")

# ── 2. pp1-body class — update collapsed classes ─────────────────────────────
old_body_class = (
    'className={`pp1-body${isStackedLayout ? " pp1-body--stacked" : ""}${leftPanelCollapsed ? " pp1-body--left-collapsed" : ""}${rightPanelCollapsed ? " pp1-body--right-collapsed" : ""}`}'
)
new_body_class = (
    'className={`pp1-body${isStackedLayout ? " pp1-body--stacked" : ""}${panelsCollapsed ? " pp1-body--left-collapsed pp1-body--right-collapsed" : ""}`}'
)
if old_body_class in content:
    content = content.replace(old_body_class, new_body_class, 1)
    changes.append("2. pp1-body class updated")
else:
    changes.append("2. FAILED: pp1-body class not found")

# ── 3. LEFT PANEL: Replace collapsed section + rail ─────────────────────────
old_left_section = (
    '          <section className={`pp1-panel pp1-panel--left${leftPanelCollapsed ? " pp1-panel--dl-collapsed" : ""}`}>\n'
    '            {/* ── Collapsed state: icon only centered (DashboardLayout style) ── */}\n'
    '            {leftPanelCollapsed && ('
)
new_left_section = (
    '          <section className={`pp1-panel pp1-panel--left${panelsCollapsed ? " pp1-panel--dl-collapsed" : ""}`}>\n'
    '            {/* ── Collapsed state: icon only centered (DashboardLayout style) ── */}\n'
    '            {panelsCollapsed && ('
)
if old_left_section in content:
    content = content.replace(old_left_section, new_left_section, 1)
    changes.append("3. Left section class updated")
else:
    changes.append("3. FAILED: Left section class not found")

# ── 4. Left rail expand button ───────────────────────────────────────────────
old_left_expand = "                  onClick={() => setLeftPanelCollapsed(false)}\n                  title=\"Expand Current Status\""
new_left_expand = "                  onClick={() => setPanelsCollapsed(false)}\n                  title=\"Expand panels\""
if old_left_expand in content:
    content = content.replace(old_left_expand, new_left_expand, 1)
    changes.append("4. Left expand button updated")
else:
    changes.append("4. FAILED: Left expand button not found")

# ── 5. Left expanded state conditional ──────────────────────────────────────
old_left_exp = "            {!leftPanelCollapsed && ("
new_left_exp = "            {!panelsCollapsed && ("
if old_left_exp in content:
    content = content.replace(old_left_exp, new_left_exp, 1)
    changes.append("5. Left expanded conditional updated")
else:
    changes.append("5. FAILED: Left expanded conditional not found")

# ── 6. Left panel head — replace old head with new head containing icon ──────
old_left_head = (
    '                <div className="pp1-panel__head">\n'
    '                  <div className="pp1-panel__header">\n'
    '                    <ClipboardList size={16} style={{ color: "var(--pp1-blue)", flexShrink: 0 }} />\n'
    '                    <h2 className="pp1-panel__title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>\n'
    '                      Current Status\n'
    '                      <span style={{\n'
    '                        fontSize: "11px",\n'
    '                        fontWeight: 800,\n'
    '                        color: "#2563eb",\n'
    '                        background: "rgba(37, 99, 235, 0.08)",\n'
    '                        border: "1px solid rgba(37, 99, 235, 0.16)",\n'
    '                        padding: "1px 6px",\n'
    '                        borderRadius: "10px",\n'
    '                        lineHeight: 1.2\n'
    '                      }}>\n'
    '                        {ACTION_CARDS.filter(a => !getCardStatus(a.id).belowTarget).length}\n'
    '                      </span>\n'
    '                    </h2>\n'
    '                  </div>\n'
    '                  <p className="pp1-panel__hint">Click a card to explore details</p>\n'
    '                </div>'
)
new_left_head = (
    '                <div className="pp1-panel__head">\n'
    '                  <div className="pp1-panel__header">\n'
    '                    <ClipboardList size={16} style={{ color: "var(--pp1-blue)", flexShrink: 0 }} />\n'
    '                    <h2 className="pp1-panel__title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>\n'
    '                      Current Status\n'
    '                      <span style={{\n'
    '                        fontSize: "11px",\n'
    '                        fontWeight: 800,\n'
    '                        color: "#2563eb",\n'
    '                        background: "rgba(37, 99, 235, 0.08)",\n'
    '                        border: "1px solid rgba(37, 99, 235, 0.16)",\n'
    '                        padding: "1px 6px",\n'
    '                        borderRadius: "10px",\n'
    '                        lineHeight: 1.2\n'
    '                      }}>\n'
    '                        {ACTION_CARDS.filter(a => !getCardStatus(a.id).belowTarget).length}\n'
    '                      </span>\n'
    '                    </h2>\n'
    '                    <button\n'
    '                      className="pp1-panels-collapse-btn"\n'
    '                      onClick={() => setPanelsCollapsed(true)}\n'
    '                      title="Collapse both panels"\n'
    '                    >\n'
    '                      <PanelLeftClose size={14} />\n'
    '                    </button>\n'
    '                  </div>\n'
    '                  <p className="pp1-panel__hint">Click a card to explore details</p>\n'
    '                </div>'
)
if old_left_head in content:
    content = content.replace(old_left_head, new_left_head, 1)
    changes.append("6. Left panel head updated with collapse icon")
else:
    changes.append("6. FAILED: Left panel head not found")

# ── 7. Remove the old left Collapse button at bottom ─────────────────────────
old_left_collapse_btn = (
    '                {/* ── Collapse button at bottom (DashboardLayout style) ── */}\n'
    '                <button\n'
    '                  className="pp1-dl-collapse-btn pp1-dl-collapse-btn--left"\n'
    '                  onClick={() => setLeftPanelCollapsed(true)}\n'
    '                  title="Collapse Current Status"\n'
    '                >\n'
    '                  <ChevronLeft size={16} />\n'
    '                  <span className="pp1-dl-collapse-label">Collapse</span>\n'
    '                </button>'
)
if old_left_collapse_btn in content:
    content = content.replace(old_left_collapse_btn, '', 1)
    changes.append("7. Left bottom collapse btn removed")
else:
    changes.append("7. FAILED: Left bottom collapse btn not found")

# ── 8. RIGHT PANEL: Replace collapsed section + rail ─────────────────────────
old_right_section = (
    '          <section className={`pp1-panel pp1-panel--right${rightPanelCollapsed ? " pp1-panel--dl-collapsed" : ""}`}>\n'
    '            {/* ── Collapsed state: icon only centered (DashboardLayout style) ── */}\n'
    '            {rightPanelCollapsed && ('
)
new_right_section = (
    '          <section className={`pp1-panel pp1-panel--right${panelsCollapsed ? " pp1-panel--dl-collapsed" : ""}`}>\n'
    '            {/* ── Collapsed state: icon only centered (DashboardLayout style) ── */}\n'
    '            {panelsCollapsed && ('
)
if old_right_section in content:
    content = content.replace(old_right_section, new_right_section, 1)
    changes.append("8. Right section class updated")
else:
    changes.append("8. FAILED: Right section class not found")

# ── 9. Right rail expand button ──────────────────────────────────────────────
old_right_expand = "                  onClick={() => setRightPanelCollapsed(false)}\n                  title=\"Expand Action to be Taken\""
new_right_expand = "                  onClick={() => setPanelsCollapsed(false)}\n                  title=\"Expand panels\""
if old_right_expand in content:
    content = content.replace(old_right_expand, new_right_expand, 1)
    changes.append("9. Right expand button updated")
else:
    changes.append("9. FAILED: Right expand button not found")

# ── 10. Right expanded state conditional ─────────────────────────────────────
old_right_exp = "            {!rightPanelCollapsed && ("
new_right_exp = "            {!panelsCollapsed && ("
if old_right_exp in content:
    content = content.replace(old_right_exp, new_right_exp, 1)
    changes.append("10. Right expanded conditional updated")
else:
    changes.append("10. FAILED: Right expanded conditional not found")

# ── 11. Right panel head — add collapse icon ──────────────────────────────────
old_right_head = (
    '                <div className="pp1-panel__head">\n'
    '                  <div className="pp1-panel__header">\n'
    '                    <ListTodo size={16} style={{ color: "var(--pp1-amber)", flexShrink: 0 }} />\n'
    '                    <h2 className="pp1-panel__title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>\n'
    '                      Action to be Taken\n'
    '                      <span style={{\n'
    '                        fontSize: "11px",\n'
    '                        fontWeight: 800,\n'
    '                        color: "#ef4444",\n'
    '                        background: "rgba(239, 68, 68, 0.08)",\n'
    '                        border: "1px solid rgba(239, 68, 68, 0.16)",\n'
    '                        padding: "1px 6px",\n'
    '                        borderRadius: "10px",\n'
    '                        lineHeight: 1.2\n'
    '                      }}>\n'
    '                        {actionItems.length}\n'
    '                      </span>\n'
    '                    </h2>\n'
    '                  </div>\n'
    '                  <p className="pp1-panel__hint">List of pending actions</p>\n'
    '                </div>'
)
new_right_head = (
    '                <div className="pp1-panel__head">\n'
    '                  <div className="pp1-panel__header">\n'
    '                    <ListTodo size={16} style={{ color: "var(--pp1-amber)", flexShrink: 0 }} />\n'
    '                    <h2 className="pp1-panel__title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>\n'
    '                      Action to be Taken\n'
    '                      <span style={{\n'
    '                        fontSize: "11px",\n'
    '                        fontWeight: 800,\n'
    '                        color: "#ef4444",\n'
    '                        background: "rgba(239, 68, 68, 0.08)",\n'
    '                        border: "1px solid rgba(239, 68, 68, 0.16)",\n'
    '                        padding: "1px 6px",\n'
    '                        borderRadius: "10px",\n'
    '                        lineHeight: 1.2\n'
    '                      }}>\n'
    '                        {actionItems.length}\n'
    '                      </span>\n'
    '                    </h2>\n'
    '                    <button\n'
    '                      className="pp1-panels-collapse-btn"\n'
    '                      onClick={() => setPanelsCollapsed(true)}\n'
    '                      title="Collapse both panels"\n'
    '                    >\n'
    '                      <PanelRightClose size={14} />\n'
    '                    </button>\n'
    '                  </div>\n'
    '                  <p className="pp1-panel__hint">List of pending actions</p>\n'
    '                </div>'
)
if old_right_head in content:
    content = content.replace(old_right_head, new_right_head, 1)
    changes.append("11. Right panel head updated with collapse icon")
else:
    changes.append("11. FAILED: Right panel head not found")

# ── 12. Remove old right Collapse button at bottom ───────────────────────────
old_right_collapse_btn = (
    '                {/* ── Collapse button at bottom (DashboardLayout style) ── */}\n'
    '                <button\n'
    '                  className="pp1-dl-collapse-btn pp1-dl-collapse-btn--right"\n'
    '                  onClick={() => setRightPanelCollapsed(true)}\n'
    '                  title="Collapse Action to be Taken"\n'
    '                >\n'
    '                  <ChevronRight size={16} />\n'
    '                  <span className="pp1-dl-collapse-label">Collapse</span>\n'
    '                </button>'
)
if old_right_collapse_btn in content:
    content = content.replace(old_right_collapse_btn, '', 1)
    changes.append("12. Right bottom collapse btn removed")
else:
    changes.append("12. FAILED: Right bottom collapse btn not found")

# ── Print results ─────────────────────────────────────────────────────────────
print("\nResults:")
for c in changes:
    print(" ", c)

success = sum(1 for c in changes if not c.startswith("  FAILED") and "FAILED" not in c)
print(f"\n{success}/{len(changes)} changes applied successfully")

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("File saved.")
