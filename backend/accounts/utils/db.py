import pyodbc

ERP_LOGIN_TIMEOUT = 5
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


def check_tenant_erp_connection(server, database, username, password, port):
    """Open and close ERP connection (used at login). Raises ErpConnectionError on failure."""
    conn = get_connection(server, database, username, password, port)
    conn.close()
