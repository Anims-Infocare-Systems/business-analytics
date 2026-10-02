"""
Tenant-scoped ERP schema catalog.

The analytics views probe INFORMATION_SCHEMA dozens of times per request
(`table_exists`, `find_first_column`, `find_column_ci`, `resolve_erp_table`).
Over the Cloudflare tunnel each probe is a full network round-trip. This module
loads the whole catalog ONCE per tenant database (one query), keeps it in
process memory and in Redis (24h), and answers every probe locally.

Catalog shape::

    {
        "tables": {
            "<table_lower>": [ {"schema": "dbo", "name": "Bill_Mas",
                                "columns": {"<col_lower>": "ActualCol", ...}}, ... ]
        }
    }

A table name can exist in several schemas; entries are ordered by
(schema, name) exactly like the old `resolve_erp_table` query.
"""
import logging
import threading

logger = logging.getLogger(__name__)

SCHEMA_CACHE_TTL = 24 * 3600

_PROCESS_CACHE = {}
_LOCK = threading.Lock()


def _norm(value):
    return str(value or "").strip().lower()


def _real_connection(cursor):
    conn = cursor.connection
    inner = getattr(conn, "_conn", None)
    return inner if inner is not None else conn


def tenant_key_for_cursor(cursor):
    """
    Build the cache key for the database behind ``cursor``.
    Uses ODBC connection info (served from the driver's cached connect attributes).
    """
    import pyodbc

    conn = _real_connection(cursor)
    key = getattr(conn, "_ba_tenant_key", None)
    if key:
        return key
    try:
        server = conn.getinfo(pyodbc.SQL_SERVER_NAME)
    except Exception:
        server = ""
    try:
        database = conn.getinfo(pyodbc.SQL_DATABASE_NAME)
    except Exception:
        database = ""
    return f"{_norm(server)}|{_norm(database)}"


def _load_catalog_from_db(cursor):
    cursor.execute(
        """
        SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
        """
    )
    tables = {}
    current = None
    for schema, table, column in cursor.fetchall():
        t_key = _norm(table)
        if current is None or current["schema"] != schema or current["name"] != table:
            current = {"schema": schema, "name": table, "columns": {}}
            tables.setdefault(t_key, []).append(current)
        current["columns"][_norm(column)] = column
    for entries in tables.values():
        entries.sort(key=lambda e: (e["schema"], e["name"]))
    return {"tables": tables}


def get_catalog(cursor, *, refresh=False):
    """Return the schema catalog for the tenant DB behind ``cursor``."""
    from django.core.cache import cache

    key = tenant_key_for_cursor(cursor)
    if not refresh:
        with _LOCK:
            cat = _PROCESS_CACHE.get(key)
        if cat is not None:
            return cat
        try:
            cat = cache.get(f"erp_schema:{key}")
        except Exception:
            cat = None
        if cat is not None:
            with _LOCK:
                _PROCESS_CACHE[key] = cat
            return cat

    cat = _load_catalog_from_db(cursor)
    with _LOCK:
        _PROCESS_CACHE[key] = cat
    try:
        cache.set(f"erp_schema:{key}", cat, timeout=SCHEMA_CACHE_TTL)
    except Exception as exc:
        logger.warning("schema catalog cache set failed for %s: %s", key, exc)
    return cat


def invalidate_catalog(cursor=None, key=None):
    from django.core.cache import cache

    if key is None and cursor is not None:
        key = tenant_key_for_cursor(cursor)
    if not key:
        return
    with _LOCK:
        _PROCESS_CACHE.pop(key, None)
    try:
        cache.delete(f"erp_schema:{key}")
    except Exception:
        pass


# ── Probe API (drop-in replacements for the old INFORMATION_SCHEMA helpers) ──

def _entries(cursor, table_name, schema=None):
    entries = get_catalog(cursor)["tables"].get(_norm(table_name), [])
    if schema:
        s = _norm(schema)
        entries = [e for e in entries if _norm(e["schema"]) == s]
    return entries


def table_exists(cursor, table_name):
    return bool(_entries(cursor, table_name))


def find_first_table(cursor, candidates):
    for t in candidates:
        if table_exists(cursor, t):
            return t
    return None


def resolve_erp_table(cursor, candidate_names):
    for logical in candidate_names:
        entries = _entries(cursor, logical)
        if entries:
            e = entries[0]
            return e["schema"], e["name"], f"[{e['schema']}].[{e['name']}]"
    return None, None, None


def find_first_column(cursor, table_name, candidates):
    """Returns the first candidate that exists (as passed by caller), else None."""
    cols = {}
    for e in _entries(cursor, table_name):
        cols.update(e["columns"])
    if not cols:
        return None
    for col in candidates:
        if _norm(col) in cols:
            return col
    return None


def find_column_ci(cursor, table_schema, table_name, candidates):
    """Returns the ACTUAL column name (DB casing) of the first matching candidate."""
    cols = {}
    for e in _entries(cursor, table_name, table_schema):
        cols.update(e["columns"])
    if not cols:
        return None
    for col in candidates:
        actual = cols.get(_norm(col))
        if actual:
            return actual
    return None


def existing_columns(cursor, table_name, candidates, schema="dbo"):
    """All candidates that exist on ``table`` (actual DB casing, de-duplicated, caller order)."""
    cols = {}
    for e in _entries(cursor, table_name, schema):
        cols.update(e["columns"])
    out = []
    for col in candidates:
        actual = cols.get(_norm(col))
        if actual and actual not in out:
            out.append(actual)
    return out
