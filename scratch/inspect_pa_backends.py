with open('backend/accounts/views_production_analysis.py', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

for target in ['production_analysis_report', 'production_value_report', 'production_idle_breakdown', 'production_analysis_daily_details']:
    pos = text.find(f'def {target}')
    if pos != -1:
        print("="*40, target)
        print(text[pos:pos+450])
