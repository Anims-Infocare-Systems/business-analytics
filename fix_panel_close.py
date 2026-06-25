#!/usr/bin/env python3
"""Fix the closing tags of the left panel to add the fragment closer."""
import re

filepath = r"Frontend\src\assets\Pages\plantperformance1.jsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# The left panel kpi-list closes with 12-space indent </div>
# then 10-space indent </section>
# We need to insert </> before </section> for the left panel only (first occurrence)
old = "            </div>\n          </section>\n\n          <section className=\"pp1-center\""
new = "                </div>\n              </>\n            )}\n          </section>\n\n          <section className=\"pp1-center\""

if old in content:
    content = content.replace(old, new, 1)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("SUCCESS: Left panel closing tags fixed")
else:
    # Try LF only
    old2 = old.replace("\n", "\r\n")
    if old2 in content:
        new2 = new.replace("\n", "\r\n")
        content = content.replace(old2, new2, 1)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print("SUCCESS (CRLF): Left panel closing tags fixed")
    else:
        # Show nearby content around the center panel marker
        idx = content.find('pp1-center\" ref={centerRef}')
        if idx != -1:
            print("FOUND center at idx:", idx)
            print("Context (500 chars before):")
            print(repr(content[idx-500:idx+50]))
        else:
            print("ERROR: Could not find marker")
