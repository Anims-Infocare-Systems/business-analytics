import os
import re

files = [
    'Frontend/src/assets/Pages/plantperformance1.jsx',
    'Frontend/src/assets/Pages/SalesAnalysis.jsx',
    'Frontend/src/assets/Pages/PurchaseAnalysis.jsx',
    'Frontend/src/assets/Pages/QualityAnalysis.jsx',
    'Frontend/src/assets/Pages/Charts.jsx'
]

for fp in files:
    with open(fp, 'r', encoding='utf-8', errors='ignore') as f:
        text = f.read()
    
    # Check pagination
    has_pagination = 'pagination' in text.lower() or 'page_size' in text.lower() or 'currentpage' in text.lower()
    # Check slice
    slice_matches = re.findall(r'\.slice\([0-9\s,a-zA-Z_]+\)', text)
    # Check map rendering
    map_matches = re.findall(r'\.map\(', text)
    
    print(f"=== {os.path.basename(fp)} ===")
    print(f"  Size: {len(text)/1024:.1f} KB | Lines: {len(text.splitlines())}")
    print(f"  Has pagination keywords: {has_pagination}")
    print(f"  Total .map() rendering loops: {len(map_matches)}")
    print(f"  Total .slice() calls: {len(slice_matches)}")

