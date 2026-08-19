import os
from pathlib import Path
from contextlib import contextmanager
from google.cloud.sql.connector import Connector
import pymysql
import pymysql.cursors

SECRETS_DIR = Path(__file__).parent.parent / "secrets"
DB_PROPS_PATH = SECRETS_DIR / "db.properties"
SA_JSON_PATH = SECRETS_DIR / "service-account.json"

def load_db_properties() -> dict:
    props = {}
    if DB_PROPS_PATH.exists():
        with open(DB_PROPS_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    props[k.strip()] = v.strip()
    return props

props = load_db_properties()
if SA_JSON_PATH.exists():
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(SA_JSON_PATH)

_connector = None

def get_connector():
    global _connector
    if _connector is None:
        _connector = Connector()
    return _connector

def get_connection():
    db_host = props.get("db.host", os.getenv("DB_HOST", ""))
    user = props.get("db.user", os.getenv("DB_USER", "root"))
    password = props.get("db.password", os.getenv("DB_PASSWORD", ""))
    db_name = props.get("db.name", os.getenv("DB_NAME", "sqlphantoms"))
    instance_name = props.get("instance.connection.name", os.getenv("INSTANCE_CONNECTION_NAME", ""))

    if db_host:
        return pymysql.connect(
            host=db_host,
            user=user,
            password=password,
            database=db_name,
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=True
        )
    
    try:
        conn = get_connector().connect(
            instance_name,
            "pymysql",
            user=user,
            password=password,
            db=db_name,
            autocommit=True
        )
        return conn
    except Exception as err:
        try:
            return pymysql.connect(
                host="127.0.0.1",
                user=user,
                password=password,
                database=db_name,
                cursorclass=pymysql.cursors.DictCursor,
                autocommit=True
            )
        except Exception:
            raise RuntimeError(
                f"Connection Error: {err}"
            )

@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()
