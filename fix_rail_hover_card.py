#!/usr/bin/env python3
"""
Replace CSS ::after tooltip with React portal hover card.
Shows a rich glassmorphism card on hover over collapsed rail icons.
Uses getBoundingClientRect + createPortal for perfect positioning.
"""

filepath = r"Frontend\src\assets\Pages\plantperformance1.jsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()
content = content.replace('\r\n', '\n')

changes = []

# ── 1. Add railHover state after panelsCollapsed ──────────────────────────────
old_state = "  const [panelsCollapsed, setPanelsCollapsed] = useState(false);"
new_state = (
    "  const [panelsCollapsed, setPanelsCollapsed] = useState(false);\n"
    "  const [railHover, setRailHover] = useState(null); // {id,title,Icon,color,rect,side}"
)
if old_state in content:
    content = content.replace(old_state, new_state, 1)
    changes.append("1. railHover state added")
else:
    changes.append("1. FAILED: panelsCollapsed state not found")

# ── 2. Left rail items: add onMouseEnter/Leave ───────────────────────────────
old_left_item = (
    '                        data-tooltip={a.title}\n'
    '                        role="button"\n'
    '                        tabIndex={0}\n'
    '                        onClick={() => { handleActionClick(a.id); }}\n'
    '                        onKeyDown={e => e.key === "Enter" && handleActionClick(a.id)}'
)
new_left_item = (
    '                        role="button"\n'
    '                        tabIndex={0}\n'
    '                        onClick={() => { handleActionClick(a.id); }}\n'
    '                        onKeyDown={e => e.key === "Enter" && handleActionClick(a.id)}\n'
    '                        onMouseEnter={e => setRailHover({ id: a.id, title: a.title, Icon: a.icon, color: a.color, rect: e.currentTarget.getBoundingClientRect(), side: "left" })}\n'
    '                        onMouseLeave={() => setRailHover(null)}'
)
if old_left_item in content:
    content = content.replace(old_left_item, new_left_item, 1)
    changes.append("2. Left rail item hover events added")
else:
    changes.append("2. FAILED: Left rail item attrs not found")

# ── 3. Right rail items: add onMouseEnter/Leave ──────────────────────────────
old_right_item = (
    '                        data-tooltip={item.title}\n'
    '                        role="button"\n'
    '                        tabIndex={0}\n'
    '                        onClick={() => handleActionClick(item.id)}\n'
    '                        onKeyDown={e => e.key === "Enter" && handleActionClick(item.id)}'
)
new_right_item = (
    '                        role="button"\n'
    '                        tabIndex={0}\n'
    '                        onClick={() => handleActionClick(item.id)}\n'
    '                        onKeyDown={e => e.key === "Enter" && handleActionClick(item.id)}\n'
    '                        onMouseEnter={e => setRailHover({ id: item.id, title: item.title, Icon: AlertTriangle, color: item.color, rect: e.currentTarget.getBoundingClientRect(), side: "right" })}\n'
    '                        onMouseLeave={() => setRailHover(null)}'
)
if old_right_item in content:
    content = content.replace(old_right_item, new_right_item, 1)
    changes.append("3. Right rail item hover events added")
else:
    changes.append("3. FAILED: Right rail item attrs not found")

# ── 4. Add portal hover card render just before the closing </section> of pp1-body ──
# Find the end of the pp1-body div (right before the </section> of the whole layout)
# We'll append it just before the closing </div> of pp1-body

old_body_end = (
    '          </section>\n'
    '        </div>\n'
    '\n'
    '        {selectionId === "customer_po_vs_sales_analysis"'
)
portal_card = (
    '          </section>\n'
    '        </div>\n'
    '\n'
    '        {/* ── Rail hover card portal ─────────────────────────── */}\n'
    '        {railHover && createPortal(\n'
    '          <div\n'
    '            className={`pp1-rail-hover-card${railHover.side === "right" ? " pp1-rail-hover-card--right" : ""}`}\n'
    '            style={{\n'
    '              position: "fixed",\n'
    '              top: railHover.rect.top + railHover.rect.height / 2,\n'
    '              ...(railHover.side === "left"\n'
    '                ? { left: railHover.rect.right + 14 }\n'
    '                : { right: window.innerWidth - railHover.rect.left + 14 }),\n'
    '              transform: "translateY(-50%)",\n'
    '              zIndex: 99999,\n'
    '              "--hc": railHover.color,\n'
    '            }}\n'
    '          >\n'
    '            {railHover.side === "left" && <div className="pp1-rail-hover-card__arrow pp1-rail-hover-card__arrow--left" />}\n'
    '            <div className="pp1-rail-hover-card__icon">\n'
    '              <railHover.Icon size={18} style={{ color: railHover.color }} />\n'
    '            </div>\n'
    '            <span className="pp1-rail-hover-card__title">{railHover.title}</span>\n'
    '            {railHover.side === "right" && <div className="pp1-rail-hover-card__arrow pp1-rail-hover-card__arrow--right" />}\n'
    '          </div>,\n'
    '          document.body\n'
    '        )}\n'
    '\n'
    '        {selectionId === "customer_po_vs_sales_analysis"'
)

if old_body_end in content:
    content = content.replace(old_body_end, portal_card, 1)
    changes.append("4. Portal hover card added")
else:
    changes.append("4. FAILED: pp1-body end marker not found")

# Print results
print("\nResults:")
for c in changes:
    print(" ", c)

success = sum(1 for c in changes if "FAILED" not in c)
print(f"\n{success}/{len(changes)} changes applied")

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("File saved.")
