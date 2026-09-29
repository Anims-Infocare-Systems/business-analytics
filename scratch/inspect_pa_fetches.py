import re

with open('Frontend/src/assets/Pages/ProductionAnalysis.jsx', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

lines = text.splitlines()
for i, l in enumerate(lines):
    if 'fetch(' in l:
        print(f"Line {i+1}: {l.strip()[:100]}")
