import pyodbc

# ✅ Enable ODBC Driver connection pooling across worker requests
# Reuses existing TCP/TLS physical connections to avoid handshake latency
pyodbc.pooling = True

ERP_LOGIN_TIMEOUT = 15
LOGIN_ERP_TIMEOUT = 10
ERP_UNAVAILABLE_MSG = (
    "ERP Server is unavailable. Please check your network connection."
)


class ErpConnectionError(Exception):
    """Tenant ERP SQL Server cannot be reached or login failed."""


def get_connection(server, database, username, password, port, *, login_timeout=None):
    server = (server or "").strip()
    database = (database or "").strip()
    username = (username or "").strip()
    timeout = ERP_LOGIN_TIMEOUT if login_timeout is None else int(login_timeout)
    port = int(port)
    conn_str = (
        f"DRIVER={{ODBC Driver 17 for SQL Server}};"
        f"SERVER={server},{port};"
        f"DATABASE={database};"
        f"UID={username};"
        f"PWD={password};"
        f"LoginTimeout={timeout};"
    )
    try:
        return pyodbc.connect(conn_str)
    except pyodbc.Error as exc:
        raise ErpConnectionError(ERP_UNAVAILABLE_MSG) from exc


class RequestScopedConnection:
    """
    Thin proxy around a pyodbc connection that is owned by the current HTTP request.

    Views historically call ``conn.close()`` at the end of their body. With request
    scoping, several views (bundle sub-views, helpers) share one physical connection
    per thread, so ``close()`` here is a no-op; the real connection is closed once by
    ``release_request_connections`` (middleware / bundle runner).
    """

    __slots__ = ("_conn", "tenant_key")

    def __init__(self, conn, tenant_key):
        self._conn = conn
        self.tenant_key = tenant_key

    def __getattr__(self, name):
        return getattr(self._conn, name)

    def close(self):  # deferred to request end
        return None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


def tenant_key_from_tenant(tenant):
    return (
        str(tenant.get("erp_server") or "").strip().lower(),
        str(tenant.get("erp_port") or "").strip(),
        str(tenant.get("erp_database") or "").strip().lower(),
    )


def _http_request(request):
    return getattr(request, "_request", request)


def get_request_scoped_connection(request, tenant):
    """
    Return a per-request, per-thread pyodbc connection for ``tenant``.
    Reuses an already-open connection when the same request (or a bundle running
    on behalf of it) asks again, instead of paying a new tunnel + TDS login.
    """
    import threading

    http_req = _http_request(request)
    pool = getattr(http_req, "_erp_conn_pool", None)
    if pool is None:
        pool = {}
        try:
            http_req._erp_conn_pool = pool
        except Exception:
            pool = None

    key = tenant_key_from_tenant(tenant)
    tid = threading.get_ident()

    if pool is not None:
        entry = pool.get(tid)
        if entry is not None and entry[0] == key:
            return RequestScopedConnection(entry[1], key)
        if entry is not None:
            try:
                entry[1].close()
            except Exception:
                pass

    conn = get_connection(
        tenant["erp_server"], tenant["erp_database"], tenant["erp_user"],
        tenant["erp_password"], tenant["erp_port"],
    )
    if pool is None:
        # Could not attach to request: behave like a normal connection.
        return conn

    pool[tid] = (key, conn)
    return RequestScopedConnection(conn, key)


def release_request_connections(request):
    """Close every ERP connection opened on behalf of this request (all threads)."""
    http_req = _http_request(request)
    pool = getattr(http_req, "_erp_conn_pool", None)
    if not pool:
        return
    for _tid, (_key, conn) in list(pool.items()):
        try:
            conn.close()
        except Exception:
            pass
    pool.clear()


def check_tenant_erp_connection(server, database, username, password, port, *, login_timeout=None):
    """Open and close ERP connection (used at login). Raises ErpConnectionError on failure."""
    timeout = LOGIN_ERP_TIMEOUT if login_timeout is None else login_timeout
    conn = get_connection(server, database, username, password, port, login_timeout=timeout)
    conn.close()
