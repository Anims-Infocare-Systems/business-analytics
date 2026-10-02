"""
Small SQL-building helpers shared by the analytics views.

* ``date_range_sql`` – index-friendly (SARGable) date range predicate. Replaces
  ``CAST(col AS DATE) BETWEEN ? AND ?`` which forces a scan on SQL Server.
* ``paginate_params`` / ``paginate_sql`` – OFFSET/FETCH pagination with a total
  count so the frontend can stop downloading whole tables.
"""

DEFAULT_PAGE_SIZE = 100
MAX_PAGE_SIZE = 500


def date_range_sql(column_expr, start_date, end_date):
    """
    Returns ``(sql, params)`` for an inclusive calendar-date range on a
    DATE/DATETIME column, without wrapping the column in a function:

        col >= ? AND col < DATEADD(day, 1, ?)
    """
    sql = f"{column_expr} >= ? AND {column_expr} < DATEADD(day, 1, ?)"
    return sql, [start_date, end_date]


def paginate_params(request, default_size=DEFAULT_PAGE_SIZE, max_size=MAX_PAGE_SIZE):
    """
    Parse ``?page=&page_size=`` from the request.

    Returns ``(page, page_size, offset, paginated)`` where ``paginated`` is False
    when the client did not ask for pagination at all (legacy callers keep the
    full payload until they are migrated).
    """
    raw_page = (request.GET.get("page") or "").strip()
    raw_size = (request.GET.get("page_size") or request.GET.get("limit") or "").strip()
    if not raw_page and not raw_size:
        return 1, None, 0, False
    try:
        page = max(1, int(raw_page or 1))
    except ValueError:
        page = 1
    try:
        size = int(raw_size or default_size)
    except ValueError:
        size = default_size
    size = max(1, min(size, max_size))
    return page, size, (page - 1) * size, True


def paginate_sql(order_by_sql, offset, page_size):
    """
    ORDER BY ... OFFSET ? ROWS FETCH NEXT ? ROWS ONLY  (SQL Server 2012+).
    ``order_by_sql`` must include the leading ``ORDER BY``.
    Returns ``(sql_suffix, params)``.
    """
    return f"{order_by_sql} OFFSET ? ROWS FETCH NEXT ? ROWS ONLY", [int(offset), int(page_size)]


def page_meta(page, page_size, total, returned):
    total = int(total or 0)
    if not page_size:
        return {"page": 1, "page_size": returned, "total": total, "pages": 1}
    pages = (total + page_size - 1) // page_size if page_size else 1
    return {"page": page, "page_size": page_size, "total": total, "pages": max(1, pages)}
