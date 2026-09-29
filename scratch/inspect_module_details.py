import re

def inspect_query_details():
    # 1. Production Analysis
    with open('backend/accounts/views_production_analysis.py', 'r', encoding='utf-8', errors='ignore') as f:
        pa_text = f.read()
    print("--- Production Analysis Query Snippet ---")
    pos = pa_text.find('def production_analysis_report')
    if pos != -1:
        print(pa_text[pos:pos+600])
        
    # 2. Idle Time Report
    with open('backend/accounts/views_idle_time_report.py', 'r', encoding='utf-8', errors='ignore') as f:
        it_text = f.read()
    print("\n--- Idle Time Report Query Snippet ---")
    pos = it_text.find('def idle_time_report')
    if pos != -1:
        print(it_text[pos:pos+600])

    # 3. Efficiency Report
    with open('backend/accounts/views_efficiency_report.py', 'r', encoding='utf-8', errors='ignore') as f:
        eff_text = f.read()
    print("\n--- Efficiency Report Query Snippet ---")
    pos = eff_text.find('def efficiency_report')
    if pos != -1:
        print(eff_text[pos:pos+600])

    # 4. Dashboard1
    with open('backend/accounts/views_dashboard1.py', 'r', encoding='utf-8', errors='ignore') as f:
        d1_text = f.read()
    print("\n--- Dashboard1 Query Snippets ---")
    pos = d1_text.find('def dashboard1_sales_kpi')
    if pos != -1:
        print(d1_text[pos:pos+400])

if __name__ == '__main__':
    inspect_query_details()
