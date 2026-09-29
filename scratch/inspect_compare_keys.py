import re

with open('backend/accounts/views_plantperformance.py', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

compare_keys = [
    ("customerPoCompare", "dashboard2_customer_po_vs_sales"),
    ("grnValueCompare", "plant_performance_grn_value"),
    ("fgValueCompare", "plant_performance_fg_value"),
    ("salesAnalysisCompare", "dashboard2_sales_analysis"),
    ("purchaseValueCompare", "dashboard2_purchase_value"),
    ("efficiencyCompare", "plant_performance_efficiency"),
    ("oeeCompare", "plant_performance_oee"),
    ("rejectionCompare", "plant_performance_rejection"),
    ("reworkCompare", "plant_performance_rework"),
    ("complaintCompare", "plant_performance_customer_complaint"),
    ("capaCompare", "plant_performance_capa"),
    ("operatorEfficiencyCompare", "plant_performance_operator_efficiency"),
    ("dailyProductionCompare", "plant_performance_daily_production"),
    ("productionValueCompare", "plant_performance_production_value"),
    ("machineEfficiencyCompare", "plant_performance_machine_efficiency"),
    ("targetVsActualCompare", "plant_performance_target_vs_actual")
]

for key, fn_name in compare_keys:
    pos = text.find(f"def {fn_name}")
    if pos == -1:
        # try without dashboard2 or other names
        matches = [m.start() for m in re.finditer(rf"def [a-zA-Z0-9_]*{key}[a-zA-Z0-9_]*", text)]
        print(f"{key:25} -> Not found as def {fn_name}")
        continue
    
    snippet = text[pos:pos+1200]
    # Check if there is date filtering
    has_date_filter = any(w in snippet for w in ["parse_date_range", "start_date", "end_date", "BETWEEN", "@from", "@to", "from_param"])
    # Check tables queried
    from_tables = re.findall(r'FROM\s+([A-Za-z0-9_#\[\]]+)', snippet, re.IGNORECASE)
    print(f"{key:25} -> Found! Has date filter: {has_date_filter}. Tables: {from_tables[:3]}")

