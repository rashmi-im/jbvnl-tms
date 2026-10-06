import sqlite3
import os
import re
import secrets
import hashlib
import hmac
from datetime import datetime
from contextlib import contextmanager
from dotenv import load_dotenv

# Load environment variables from .env file if available
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(HERE, ".env"))

from app.config import DB_PATH, DATE_FORMAT, SEED_PASSWORD

# PostgreSQL configuration
DATABASE_URL = os.environ.get("DATABASE_URL")
POSTGRES_USER = os.environ.get("POSTGRES_USER")
POSTGRES_PASSWORD = os.environ.get("POSTGRES_PASSWORD", "")
POSTGRES_HOST = os.environ.get("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.environ.get("POSTGRES_PORT", "5432")
POSTGRES_DB = os.environ.get("POSTGRES_DB", "tms_db")

USE_POSTGRES = False
psycopg2 = None
RealDictCursor = None

if DATABASE_URL or POSTGRES_USER:
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        USE_POSTGRES = True
    except ImportError:
        print("⚠️ psycopg2 not installed. Falling back to SQLite.")

def get_pg_connection_string():
    if DATABASE_URL:
        return DATABASE_URL
    user_part = f"{POSTGRES_USER}:{POSTGRES_PASSWORD}@" if POSTGRES_PASSWORD else f"{POSTGRES_USER}@"
    return f"postgresql://{user_part}{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

def now_str():
    return datetime.now().strftime(DATE_FORMAT)

def parse_dt(s: str) -> datetime:
    s_clean = s[:19].replace("T", " ")
    if len(s_clean) == 16:
        s_clean += ":00"
    return datetime.strptime(s_clean, DATE_FORMAT)

class DBRow(dict):
    """
    Row dictionary object that supports both string key access (row["col"])
    and integer index access (row[0]), fully compatible with sqlite3.Row.
    """
    def __init__(self, items=None):
        super().__init__(items or {})
        self._keys = list(self.keys())

    def __getitem__(self, item):
        if isinstance(item, int):
            return super().__getitem__(self._keys[item])
        return super().__getitem__(item)

TABLES_WITH_ID = {
    "circles", "divisions", "subdivisions", "sections", "feeders", "pss",
    "lookups", "users", "transformers", "failures", "approval_history",
    "notifications", "audit_logs"
}

class PostgresCursorWrapper:
    """
    Adapter wrapper around psycopg2 cursor to make it behave identically
    to sqlite3 cursor (e.g., translating '?' to '%s', handling row dict access,
    storing lastrowid, handling 'insert or ignore').
    """
    def __init__(self, conn, real_cursor):
        self._conn = conn
        self._cursor = real_cursor
        self.lastrowid = None

    def execute(self, query, params=None):
        params = params or ()
        # Convert SQLite 'insert or ignore into' to Postgres 'insert into ... on conflict do nothing'
        query_mod = re.sub(r"(?i)insert\s+or\s+ignore\s+into", "insert into", query)
        is_ignore = bool(re.search(r"(?i)insert\s+or\s+ignore\s+into", query))

        # Substitute SQLite '?' placeholders with Postgres '%s'
        query_mod = query_mod.replace("?", "%s")

        if is_ignore and "on conflict" not in query_mod.lower():
            query_mod += " on conflict do nothing"

        is_insert = query_mod.strip().lower().startswith("insert")
        returning_added = False

        if is_insert and "returning" not in query_mod.lower():
            match = re.search(r"(?i)insert\s+into\s+([a-zA-Z0-9_]+)", query_mod)
            if match and match.group(1).lower() in TABLES_WITH_ID:
                query_mod += " RETURNING id"
                returning_added = True

        self._cursor.execute(query_mod, params)
        if returning_added:
            try:
                row = self._cursor.fetchone()
                if row:
                    if isinstance(row, dict):
                        self.lastrowid = row.get("id")
                    else:
                        self.lastrowid = row[0]
            except Exception:
                self.lastrowid = None
        return self


    def fetchone(self):
        row = self._cursor.fetchone()
        return DBRow(row) if row is not None else None

    def fetchall(self):
        rows = self._cursor.fetchall()
        return [DBRow(r) for r in rows] if rows else []

    def fetchmany(self, size=None):
        rows = self._cursor.fetchmany(size)
        return [DBRow(r) for r in rows] if rows else []

    def executescript(self, script):
        # Convert SQLite script to Postgres
        script_pg = script.replace("?", "%s")
        self._cursor.execute(script_pg)
        return self

    def __iter__(self):
        for row in self._cursor:
            yield DBRow(row)

    @property
    def rowcount(self):
        return self._cursor.rowcount

    @property
    def description(self):
        return self._cursor.description



class PostgresConnectionWrapper:
    """Adapter for psycopg2 connection object."""
    def __init__(self, raw_conn):
        self._conn = raw_conn

    def cursor(self):
        return PostgresCursorWrapper(self._conn, self._conn.cursor(cursor_factory=RealDictCursor))

    def execute(self, query, params=None):
        cur = self.cursor()
        cur.execute(query, params)
        return cur

    def executescript(self, script):
        cur = self.cursor()
        cur.executescript(script)
        return cur

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()


def get_db_conn():
    if USE_POSTGRES:
        conn_str = get_pg_connection_string()
        raw_conn = psycopg2.connect(conn_str)
        return PostgresConnectionWrapper(raw_conn)
    else:
        c = sqlite3.connect(DB_PATH, timeout=15)
        c.row_factory = sqlite3.Row
        c.execute("pragma foreign_keys=on")
        return c

@contextmanager
def get_db():
    conn = get_db_conn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def hpw(p: str, salt: str = None) -> str:
    salt = salt or secrets.token_hex(16)
    return salt + "$" + hashlib.pbkdf2_hmac("sha256", p.encode(), salt.encode(), 200_000).hex()

def vpw(p: str, stored: str) -> bool:
    if not stored or "$" not in stored:
        return False
    salt = stored.split("$")[0]
    return hmac.compare_digest(hpw(p, salt), stored)

SQLITE_SCHEMA = """
create table if not exists circles(id integer primary key, name text unique not null);
create table if not exists divisions(id integer primary key, name text not null, circle_id integer not null references circles);
create table if not exists subdivisions(id integer primary key, name text not null, division_id integer not null references divisions);
create table if not exists sections(id integer primary key, name text not null, subdivision_id integer not null references subdivisions);
create table if not exists feeders(id integer primary key, name text not null, section_id integer not null references sections);
create table if not exists pss(id integer primary key, name text not null, section_id integer not null references sections);
create table if not exists lookups(id integer primary key, kind text not null, value text not null, unique(kind,value));
create table if not exists users(id integer primary key, name text not null, emp_id text unique not null, pw text not null,
  mobile text, email text, role text not null check(role in('ADMIN','JE','AE','DIVISION','CIRCLE')),
  circle_id integer references circles, division_id integer references divisions,
  subdivision_id integer references subdivisions, section_id integer references sections,
  ae_id integer references users, active integer default 1);
create table if not exists sessions(token text primary key, user_id integer not null references users, created text, ip text);
create table if not exists transformers(id integer primary key, code text unique not null, dtr_no text, capacity text, ttype text,
  section_id integer not null references sections, feeder_id integer references feeders, pss_id integer references pss,
  village text, location text, active integer default 1);
create table if not exists failures(id integer primary key, rec_id text unique, transformer_id integer not null references transformers,
  entered_at text, failed_at text, subdivision_id integer not null, section_id integer not null, feeder_id integer, pss_id integer,
  village text, capacity text, ttype text, failure_type text, consumers integer, je_id integer not null references users,
  ae_id integer references users, replacement_required integer default 1, before_photo text, lat real, lng real, remarks text,
  wf_status text not null default 'draft' check(wf_status in('draft','pending_ae','returned','approved')),
  submitted_at text, approved_at text, return_reason text,
  material_shortage integer default 0, under_repair integer default 0, delay_reason text, n24 integer default 0, n48 integer default 0,
  repl_status text not null default 'none' check(repl_status in('none','draft','pending_ae','returned','approved')),
  repl_at text, new_dtr text, new_cap text, old_status text, after_photo text, repl_remarks text, restoration text,
  repl_return_reason text, repl_approved_at text);

create unique index if not exists one_active_failure on failures(transformer_id) where repl_status!='approved';
create index if not exists f_sub on failures(subdivision_id, failed_at);
create index if not exists f_je on failures(je_id); 
create index if not exists f_ae on failures(ae_id, wf_status);
create table if not exists approval_history(id integer primary key, failure_id integer references failures, kind text, action text, by_user integer, at text, reason text);
create table if not exists notifications(id integer primary key, user_id integer references users, msg text, failure_id integer, created text, is_read integer default 0);
create table if not exists audit_logs(id integer primary key, at text, user_id integer, user_name text, role text, action text, record_id text, prev text, new text, ip text);
create trigger if not exists audit_no_upd before update on audit_logs begin select raise(abort,'audit log is immutable'); end;
create trigger if not exists audit_no_del before delete on audit_logs begin select raise(abort,'audit log is immutable'); end;
create trigger if not exists f_no_del before delete on failures begin select raise(abort,'failure records cannot be deleted'); end;
create table if not exists daily_reports(report_date text, subdivision_id integer, opening integer, burnt integer, replaced integer, closing integer, generated_at text, primary key(report_date, subdivision_id));
"""

POSTGRES_SCHEMA = """
CREATE TABLE IF NOT EXISTS circles(id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS divisions(id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, circle_id INTEGER NOT NULL REFERENCES circles(id));
CREATE TABLE IF NOT EXISTS subdivisions(id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, division_id INTEGER NOT NULL REFERENCES divisions(id));
CREATE TABLE IF NOT EXISTS sections(id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, subdivision_id INTEGER NOT NULL REFERENCES subdivisions(id));
CREATE TABLE IF NOT EXISTS feeders(id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, section_id INTEGER NOT NULL REFERENCES sections(id));
CREATE TABLE IF NOT EXISTS pss(id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, section_id INTEGER NOT NULL REFERENCES sections(id));
CREATE TABLE IF NOT EXISTS lookups(id SERIAL PRIMARY KEY, kind VARCHAR(255) NOT NULL, value VARCHAR(255) NOT NULL, UNIQUE(kind,value));
CREATE TABLE IF NOT EXISTS users(
  id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, emp_id VARCHAR(255) UNIQUE NOT NULL, pw VARCHAR(255) NOT NULL,
  mobile VARCHAR(255), email VARCHAR(255), role VARCHAR(50) NOT NULL CHECK(role IN ('ADMIN','JE','AE','DIVISION','CIRCLE')),
  circle_id INTEGER REFERENCES circles(id), division_id INTEGER REFERENCES divisions(id),
  subdivision_id INTEGER REFERENCES subdivisions(id), section_id INTEGER REFERENCES sections(id),
  ae_id INTEGER REFERENCES users(id), active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS sessions(token VARCHAR(255) PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), created VARCHAR(255), ip VARCHAR(255));
CREATE TABLE IF NOT EXISTS transformers(
  id SERIAL PRIMARY KEY, code VARCHAR(255) UNIQUE NOT NULL, dtr_no VARCHAR(255), capacity VARCHAR(255), ttype VARCHAR(255),
  section_id INTEGER NOT NULL REFERENCES sections(id), feeder_id INTEGER REFERENCES feeders(id), pss_id INTEGER REFERENCES pss(id),
  village VARCHAR(255), location VARCHAR(255), active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS failures(
  id SERIAL PRIMARY KEY, rec_id VARCHAR(255) UNIQUE, transformer_id INTEGER NOT NULL REFERENCES transformers(id),
  entered_at VARCHAR(255), failed_at VARCHAR(255), subdivision_id INTEGER NOT NULL, section_id INTEGER NOT NULL, feeder_id INTEGER, pss_id INTEGER,
  village VARCHAR(255), capacity VARCHAR(255), ttype VARCHAR(255), failure_type VARCHAR(255), consumers INTEGER, je_id INTEGER NOT NULL REFERENCES users(id),
  ae_id INTEGER REFERENCES users(id), replacement_required INTEGER DEFAULT 1, before_photo TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION, remarks TEXT,
  wf_status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK(wf_status IN ('draft','pending_ae','returned','approved')),
  submitted_at VARCHAR(255), approved_at VARCHAR(255), return_reason TEXT,
  material_shortage INTEGER DEFAULT 0, under_repair INTEGER DEFAULT 0, delay_reason TEXT, n24 INTEGER DEFAULT 0, n48 INTEGER DEFAULT 0,
  repl_status VARCHAR(50) NOT NULL DEFAULT 'none' CHECK(repl_status IN ('none','draft','pending_ae','returned','approved')),
  repl_at VARCHAR(255), new_dtr VARCHAR(255), new_cap VARCHAR(255), old_status VARCHAR(255), after_photo TEXT, repl_remarks TEXT, restoration TEXT,
  repl_return_reason TEXT, repl_approved_at VARCHAR(255)
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_failure ON failures(transformer_id) WHERE repl_status != 'approved';
CREATE INDEX IF NOT EXISTS f_sub ON failures(subdivision_id, failed_at);
CREATE INDEX IF NOT EXISTS f_je ON failures(je_id); 
CREATE INDEX IF NOT EXISTS f_ae ON failures(ae_id, wf_status);
CREATE TABLE IF NOT EXISTS approval_history(id SERIAL PRIMARY KEY, failure_id INTEGER REFERENCES failures(id), kind VARCHAR(255), action VARCHAR(255), by_user INTEGER, at VARCHAR(255), reason TEXT);
CREATE TABLE IF NOT EXISTS notifications(id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), msg TEXT, failure_id INTEGER, created VARCHAR(255), is_read INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS audit_logs(id SERIAL PRIMARY KEY, at VARCHAR(255), user_id INTEGER, user_name VARCHAR(255), role VARCHAR(255), action VARCHAR(255), record_id VARCHAR(255), prev TEXT, new TEXT, ip VARCHAR(255));
CREATE TABLE IF NOT EXISTS daily_reports(report_date VARCHAR(255), subdivision_id INTEGER, opening INTEGER, burnt INTEGER, replaced INTEGER, closing INTEGER, generated_at VARCHAR(255), PRIMARY KEY(report_date, subdivision_id));
"""

def init_db():
    with get_db() as c:
        if USE_POSTGRES:
            c.executescript(POSTGRES_SCHEMA)
        else:
            c.executescript(SQLITE_SCHEMA)
        seed_db(c)

def seed_db(c):
    res = c.execute("select count(*) as cnt from users").fetchone()
    cnt = res["cnt"] if isinstance(res, dict) else res[0]
    if cnt:
        return
    ci = c.execute("insert into circles(name) values('Sahibganj Circle')").lastrowid
    dv = c.execute("insert into divisions(name,circle_id) values('Sahibganj Division',?)", (ci,)).lastrowid
    for k, vs in (("capacity", ["10 KVA", "16 KVA", "25 KVA", "63 KVA", "100 KVA", "200 KVA", "Other"]),
                  ("failure_type", ["Burnt", "Failed", "Damaged", "Oil Leakage", "Other"])):
        for v in vs:
            c.execute("insert into lookups(kind,value) values(?,?)", (k, v))
    
    H = hpw(SEED_PASSWORD)
    mk = lambda *a: c.execute("insert into users(name,emp_id,pw,role,circle_id,division_id,subdivision_id,section_id,ae_id) values(?,?,?,?,?,?,?,?,?)", (a[0], a[1], H, *a[2:])).lastrowid
    mk("Admin", "admin", "ADMIN", None, None, None, None, None)
    mk("Circle Officer", "circle1", "CIRCLE", ci, None, None, None, None)
    mk("Division Officer", "div1", "DIVISION", ci, dv, None, None, None)
    
    for i, name in enumerate(["Sahibganj", "Rajmahal", "Pakur Urban"], 1):
        sd = c.execute("insert into subdivisions(name,division_id) values(?,?)", (name, dv)).lastrowid
        sc = c.execute("insert into sections(name,subdivision_id) values(?,?)", (name + " Section-1", sd)).lastrowid
        fd = c.execute("insert into feeders(name,section_id) values(?,?)", (f"Feeder-{i}1", sc)).lastrowid
        ps = c.execute("insert into pss(name,section_id) values(?,?)", (f"PSS-{i}1", sc)).lastrowid
        ae = mk(f"AE {name}", f"ae{i}", "AE", ci, dv, sd, None, None)
        mk(f"JE {name}", f"je{i}", "JE", ci, dv, sd, sc, ae)
        for j in range(1, 4):
            c.execute("insert into transformers(code,dtr_no,capacity,ttype,section_id,feeder_id,pss_id,village) values(?,?,?,?,?,?,?,?)",
                      (f"DTR-{i}{j:04d}", f"{i}{j:04d}", "63 KVA", "3-Phase", sc, fd, ps, f"Village {i}{j}"))
    print("Database seeded successfully.")

def f_scope(u: dict):
    r = u["role"]
    if r == "ADMIN":
        return "1=1", []
    if r == "JE":
        return "f.je_id=?", [u["id"]]
    if r == "AE":
        return "f.ae_id=? and f.wf_status!='draft'", [u["id"]]
    if r == "DIVISION":
        return "f.wf_status!='draft' and f.subdivision_id in (select id from subdivisions where division_id=?)", [u["division_id"]]
    return "f.wf_status!='draft' and f.subdivision_id in (select s.id from subdivisions s join divisions d on d.id=s.division_id where d.circle_id=?)", [u["circle_id"]]

def sub_scope(u: dict):
    r = u["role"]
    if r == "ADMIN":
        return "1=1", []
    if r in ("JE", "AE"):
        return "s.id=?", [u["subdivision_id"]]
    if r == "DIVISION":
        return "s.division_id=?", [u["division_id"]]
    return "s.division_id in (select id from divisions where circle_id=?)", [u["circle_id"]]

def tstatus(f: dict, t=None) -> str | None:
    t = t or datetime.now()
    if f["repl_status"] == "approved":
        return "Replaced"
    if f["wf_status"] != "approved":
        return None
    h = (t - parse_dt(f["failed_at"])).total_seconds() / 3600
    if f["material_shortage"]:
        return "Material Shortage"
    if h > 48:
        return "Pending >48 Hours"
    if h > 24:
        return "Pending >24 Hours"
    if f["under_repair"]:
        return "Repairable / Under Repair"
    return "Under Process" if f["repl_status"] != "none" else "Pending"
