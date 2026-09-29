import os
import glob
import re

def analyze_all():
    print("=" * 70)
    print("1. ANALYZING BACKEND VIEWS & ENDPOINTS")
    print("=" * 70)
    
    view_files = glob.glob('backend/accounts/views*.py')
    total_views = 0
    endpoints = []
    
    for vf in view_files:
        basename = os.path.basename(vf)
        size_kb = os.path.getsize(vf) / 1024
        with open(vf, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Count @api_view
        api_views = re.findall(r'@api_view\(\[([^\]]+)\]\)\s*\n(?:@[^\n]+\n)*def ([a-zA-Z0-9_]+)', content)
        
        # Check raw pyodbc connections
        raw_conns = len(re.findall(r'get_tenant_connection\(', content))
        
        # Check cursor executions
        cursor_execs = len(re.findall(r'cursor\.execute\(', content))
        
        # Check caching decorators
        cached = len(re.findall(r'cache_analytics_response|cache\.get|cache\.set', content))
        
        # Check table_exists calls
        table_exists_calls = len(re.findall(r'table_exists\(', content))
        
        # Check SELECT queries without date parameter
        select_queries = re.findall(r'SELECT\s+.*?(?:FROM|from)\s+([a-zA-Z0-9_#]+)', content, re.DOTALL)
        
        print(f"{basename:35} | {size_kb:6.1f} KB | {len(api_views):2d} views | {raw_conns:2d} get_conn | {cursor_execs:2d} cursors | {cached:2d} cache refs | {table_exists_calls:2d} table_exists")

    print("\n" + "=" * 70)
    print("2. CHECKING DATABASE CONNECTION & TIMEOUT CONFIG")
    print("=" * 70)
    with open('backend/accounts/utils/db.py', 'r', encoding='utf-8', errors='ignore') as f:
        print(f.read())
        
    print("\n" + "=" * 70)
    print("3. CHECKING CACHE SETTINGS IN SETTINGS.PY")
    print("=" * 70)
    with open('backend/backend/settings.py', 'r', encoding='utf-8', errors='ignore') as f:
        settings_text = f.read()
    
    for block in ['CACHES', 'SESSION_ENGINE', 'DATABASES', 'SESSION_COOKIE_AGE']:
        pos = settings_text.find(block)
        if pos != -1:
            print(f"--- {block} ---")
            print(settings_text[pos:pos+400])

if __name__ == '__main__':
    analyze_all()
