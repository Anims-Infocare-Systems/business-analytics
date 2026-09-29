import os
import glob
import re

def analyze_charts():
    with open('Frontend/src/assets/Pages/Charts.jsx', 'r', encoding='utf-8', errors='ignore') as f:
        text = f.read()
    
    matches = re.findall(r'id:\s*["\']([^"\']+)["\']', text)
    print("Chart IDs in Charts.jsx:", matches)

if __name__ == '__main__':
    analyze_charts()
