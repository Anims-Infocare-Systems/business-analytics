import pyodbc


def get_connection(server, database, username, password, port):
    server = (server or "").strip()
    database = (database or "").strip()
    username = (username or "").strip()
    port = int(port)
    conn_str = (
        f"DRIVER={{ODBC Driver 17 for SQL Server}};"
        f"SERVER={server},{port};"
        f"DATABASE={database};"
        f"UID={username};"
        f"PWD={password}"
    )
    return pyodbc.connect(conn_str)