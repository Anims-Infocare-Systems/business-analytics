import os
import glob
import re

def analyze_all_views():
    files = sorted(glob.glob('backend/accounts/views*.py'))
    print(f"Total view files: {len(files)}")
    
    issues = {
        'unbounded_queries': [],
        'missing_cache': [],
        'table_exists_overhead': [],
        'string_agg_all_time': [],
        'correlated_subqueries': [],
        'large_top': [],
    }
    
    for fpath in files:
        fname = os.path.basename(fpath)
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
        # check table_exists
        te_count = len(re.findall(r'table_exists\(', content))
        if te_count > 5:
            issues['table_exists_overhead'].append((fname, te_count))
            
        # check cache_analytics_response
        has_cache = 'cache_analytics_response' in content or 'cache.get(' in content
        if not has_cache:
            issues['missing_cache'].append(fname)
            
        # check TOP without date or TOP > 1000
        large_tops = re.findall(r'TOP\s+(\d+)', content, re.IGNORECASE)
        for t in large_tops:
            if int(t) >= 1000:
                issues['large_top'].append((fname, t))
                
        # check STRING_AGG
        if 'STRING_AGG' in content.upper():
            issues['string_agg_all_time'].append(fname)
            
    print("\n--- Files with heavy table_exists calls (repeated schema queries over tunnel) ---")
    for fn, count in issues['table_exists_overhead']:
        print(f"  {fn:35}: {count} calls")
        
    print("\n--- Files with ZERO caching ---")
    for fn in issues['missing_cache']:
        print(f"  {fn}")
        
    print("\n--- Files with TOP >= 1000 records ---")
    for fn, count in set(issues['large_top']):
        print(f"  {fn:35}: TOP {count}")
        
    print("\n--- Files using STRING_AGG across tables ---")
    for fn in set(issues['string_agg_all_time']):
        print(f"  {fn}")

if __name__ == '__main__':
    analyze_all_views()
