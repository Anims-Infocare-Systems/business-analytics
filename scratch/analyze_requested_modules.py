import os
import glob
import re

def analyze_requested_modules():
    modules = [
        {
            'name': 'Production Analysis',
            'frontend': 'Frontend/src/assets/Pages/ProductionAnalysis.jsx',
            'backends': ['backend/accounts/views_production_analysis.py', 'backend/accounts/views_daily_production_report.py']
        },
        {
            'name': 'Idle Time Report',
            'frontend': 'Frontend/src/assets/Pages/IdleTimeReport.jsx',
            'backends': ['backend/accounts/views_idle_time_report.py']
        },
        {
            'name': 'Efficiency Report',
            'frontend': 'Frontend/src/assets/Pages/EfficiencyReport.jsx',
            'backends': [
                'backend/accounts/views_efficiency_report.py',
                'backend/accounts/views_operator_efficiency_report.py',
                'backend/accounts/views_machine_availability_report.py',
                'backend/accounts/views_oee_report.py'
            ]
        },
        {
            'name': 'Top Management Dashboard (Dashboard1)',
            'frontend': 'Frontend/src/assets/Pages/Dashboard1.jsx',
            'backends': ['backend/accounts/views_dashboard1.py']
        }
    ]

    for m in modules:
        print("=" * 80)
        print(f"MODULE: {m['name']}")
        print("=" * 80)
        
        # Frontend audit
        fe_path = m['frontend']
        if os.path.exists(fe_path):
            with open(fe_path, 'r', encoding='utf-8', errors='ignore') as f:
                fe_text = f.read()
            fe_lines = len(fe_text.splitlines())
            fe_size_kb = len(fe_text) / 1024
            fetches = re.findall(r'fetch\([`\'\"][^`\'\"]+[`\'\"]|fetch\(`[^`]+`', fe_text)
            clean_fetches = set([re.sub(r'\$\{.*?\}', '{param}', f_call)[:80] for f_call in fetches])
            maps = len(re.findall(r'\.map\(', fe_text))
            use_effects = len(re.findall(r'useEffect\(', fe_text))
            has_virtual = 'virtual' in fe_text.lower()
            has_pagination = 'pagination' in fe_text.lower() or 'currentpage' in fe_text.lower()
            
            print(f"Frontend: {fe_path}")
            print(f"  Lines: {fe_lines:,} | Size: {fe_size_kb:.1f} KB | useEffects: {use_effects} | .map() renders: {maps}")
            print(f"  Virtual scrolling: {has_virtual} | Pagination: {has_pagination}")
            print(f"  Total fetch calls: {len(fetches)} | Unique endpoints ({len(clean_fetches)}):")
            for ep in sorted(list(clean_fetches))[:10]:
                print(f"    - {ep}")
        
        # Backend audit
        print("Backends:")
        for be_path in m['backends']:
            if os.path.exists(be_path):
                with open(be_path, 'r', encoding='utf-8', errors='ignore') as f:
                    be_text = f.read()
                be_lines = len(be_text.splitlines())
                be_size_kb = len(be_text) / 1024
                
                api_views = re.findall(r'@api_view\(\[([^\]]+)\]\)\s*\n(?:@[^\n]+\n)*def ([a-zA-Z0-9_]+)', be_text)
                te_calls = len(re.findall(r'table_exists\(', be_text))
                cache_refs = len(re.findall(r'cache_analytics_response|cache\.get|cache\.set', be_text))
                raw_cursors = len(re.findall(r'cursor\.execute\(', be_text))
                selects = len(re.findall(r'SELECT\s+', be_text, re.IGNORECASE))
                ctes = len(re.findall(r'WITH\s+', be_text, re.IGNORECASE))
                
                print(f"  File: {os.path.basename(be_path)} ({be_lines:,} lines, {be_size_kb:.1f} KB)")
                print(f"    Views: {len(api_views)} | table_exists: {te_calls} | cache refs: {cache_refs} | cursors: {raw_cursors} | SELECTs: {selects} | CTEs: {ctes}")

if __name__ == '__main__':
    analyze_requested_modules()
