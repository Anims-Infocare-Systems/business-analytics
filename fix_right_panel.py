#!/usr/bin/env python3
"""Replace the old right panel vertical-collapse with the new horizontal sidebar-style collapse."""

filepath = r"Frontend\src\assets\Pages\plantperformance1.jsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# ── RIGHT PANEL: replace the section open + head + action-list open ──────────
# Old pattern: the old vertical-collapse header
old_right_head = (
    '          <section className={`pp1-panel pp1-panel--right${rightPanelCollapsed ? " pp1-panel--collapsed" : ""}`}>\n'
    '            <div className="pp1-panel__head pp1-panel__head--collapsible" onClick={() => setRightPanelCollapsed(v => !v)}>\n'
    '              <div className="pp1-panel__header">\n'
    '                <span\n'
    '                  className={`pp1-panel__collapse-icon pp1-panel__collapse-icon--amber${rightPanelCollapsed ? " pp1-panel__collapse-icon--rotated" : ""}`}\n'
    '                  onClick={e => { e.stopPropagation(); setRightPanelCollapsed(v => !v); }}\n'
    '                  aria-label={rightPanelCollapsed ? "Expand Action to be Taken" : "Collapse Action to be Taken"}\n'
    '                  title={rightPanelCollapsed ? "Expand" : "Collapse"}\n'
    '                  role="button"\n'
    '                  tabIndex={0}\n'
    '                  onKeyDown={e => e.key === "Enter" && setRightPanelCollapsed(v => !v)}\n'
    '                >\n'
    '                  <ChevronDown size={13} />\n'
    '                </span>\n'
    '                <ListTodo size={16} style={{ color: "var(--pp1-amber)", flexShrink: 0 }} />\n'
    '                <h2 className="pp1-panel__title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>\n'
    '                  Action to be Taken\n'
    '                  <span style={{\n'
    '                    fontSize: "11px",\n'
    '                    fontWeight: 800,\n'
    '                    color: "#ef4444",\n'
    '                    background: "rgba(239, 68, 68, 0.08)",\n'
    '                    border: "1px solid rgba(239, 68, 68, 0.16)",\n'
    '                    padding: "1px 6px",\n'
    '                    borderRadius: "10px",\n'
    '                    lineHeight: 1.2\n'
    '                  }}>\n'
    '                    {actionItems.length}\n'
    '                  </span>\n'
    '                </h2>\n'
    '              </div>\n'
    '              {!rightPanelCollapsed && <p className="pp1-panel__hint">List of pending actions</p>}\n'
    '            </div>\n'
    '            <div className={`pp1-action-list pp1-panel__body${rightPanelCollapsed ? " pp1-panel__body--hidden" : ""}`}>'
)

new_right_head = (
    '          <section className={`pp1-panel pp1-panel--right${rightPanelCollapsed ? " pp1-panel--side-collapsed" : ""}`}>\n'
    '            {/* ── Collapsed vertical rail ── */}\n'
    '            {rightPanelCollapsed && (\n'
    '              <div className="pp1-panel__rail pp1-panel__rail--right" onClick={() => setRightPanelCollapsed(false)} title="Expand Action to be Taken">\n'
    '                <ChevronLeft size={13} style={{ color: "#f59e0b", opacity: 0.7 }} />\n'
    '                <span className="pp1-panel__rail-label">Action to be Taken</span>\n'
    '                <ListTodo size={15} style={{ color: "var(--pp1-amber)", flexShrink: 0, marginTop: "auto" }} />\n'
    '              </div>\n'
    '            )}\n'
    '            {/* ── Normal panel content ── */}\n'
    '            {!rightPanelCollapsed && (\n'
    '              <>\n'
    '                <div className="pp1-panel__head pp1-panel__head--collapsible" onClick={() => setRightPanelCollapsed(true)}>\n'
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
    '                    <span\n'
    '                      className="pp1-panel__collapse-icon pp1-panel__collapse-icon--amber"\n'
    '                      title="Collapse"\n'
    '                      role="button"\n'
    '                      tabIndex={0}\n'
    '                      onKeyDown={e => e.key === "Enter" && setRightPanelCollapsed(true)}\n'
    '                    >\n'
    '                      <ChevronRight size={13} />\n'
    '                    </span>\n'
    '                  </div>\n'
    '                  <p className="pp1-panel__hint">List of pending actions</p>\n'
    '                </div>\n'
    '                <div className="pp1-action-list">'
)

# Also fix the closing tags: old was </div></section> now needs </div></></section>
old_right_close = (
    '            </div>\n'
    '          </section>\n'
    '        </div>\n'
    '\n'
    '        {selectionId === "customer_po_vs_sales_analysis"'
)

new_right_close = (
    '                </div>\n'
    '              </>\n'
    '            )}\n'
    '          </section>\n'
    '        </div>\n'
    '\n'
    '        {selectionId === "customer_po_vs_sales_analysis"'
)

changed = 0

# Normalize to LF for comparison
content_lf = content.replace('\r\n', '\n')
old_rh_lf = old_right_head.replace('\r\n', '\n')
new_rh_lf = new_right_head.replace('\r\n', '\n')
old_rc_lf = old_right_close.replace('\r\n', '\n')
new_rc_lf = new_right_close.replace('\r\n', '\n')

if old_rh_lf in content_lf:
    content_lf = content_lf.replace(old_rh_lf, new_rh_lf, 1)
    print("SUCCESS: Right panel head replaced")
    changed += 1
else:
    print("ERROR: Could not find right panel head to replace")
    idx = content_lf.find("pp1-panel--right")
    print(f"pp1-panel--right at idx: {idx}")
    print(repr(content_lf[idx:idx+400]))

if old_rc_lf in content_lf:
    # Find last occurrence (the right panel close, not left panel close)
    last_idx = content_lf.rfind(old_rc_lf)
    content_lf = content_lf[:last_idx] + new_rc_lf + content_lf[last_idx + len(old_rc_lf):]
    print("SUCCESS: Right panel close tags fixed")
    changed += 1
else:
    print("ERROR: Could not find right panel close pattern")
    idx = content_lf.find('customer_po_vs_sales_analysis"')
    if idx != -1:
        print("Context before customer_po_vs_sales:")
        print(repr(content_lf[idx-300:idx+50]))

if changed > 0:
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content_lf)
    print(f"File written with {changed} changes")
else:
    print("No changes made")
