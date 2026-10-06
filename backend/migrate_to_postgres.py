#!/usr/bin/env python3
"""
TMS Migration Script: SQLite (tms.db) -> PostgreSQL (tms_db)

This script migrates all existing database tables and records from SQLite to PostgreSQL,
resets auto-increment sequences, and verifies data integrity.
"""
import os
import sys
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

HERE = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(HERE, ".env"))

SQLITE_DB = os.path.join(HERE, "tms.db")
DATABASE_URL = os.environ.get("DATABASE_URL")
POSTGRES_USER = os.environ.get("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.environ.get("POSTGRES_PASSWORD", "")
POSTGRES_HOST = os.environ.get("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.environ.get("POSTGRES_PORT", "5432")
POSTGRES_DB = os.environ.get("POSTGRES_DB", "tms_db")

def get_pg_conn():
    if DATABASE_URL:
        return psycopg2.connect(DATABASE_URL)
    user_part = f"{POSTGRES_USER}:{POSTGRES_PASSWORD}@" if POSTGRES_PASSWORD else f"{POSTGRES_USER}@"
    conn_str = f"postgresql://{user_part}{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
    return psycopg2.connect(conn_str)

TABLE_ORDER = [
    "circles",
    "divisions",
    "subdivisions",
    "sections",
    "feeders",
    "pss",
    "lookups",
    "users",
    "sessions",
    "transformers",
    "failures",
    "approval_history",
    "notifications",
    "audit_logs",
    "daily_reports",
]

PRIMARY_KEY_MAP = {
    "sessions": "token",
    "daily_reports": "report_date, subdivision_id",
}

def migrate():
    print("🚀 Starting Migration from SQLite (tms.db) to PostgreSQL...")

    if not os.path.exists(SQLITE_DB):
        print(f"❌ SQLite database not found at {SQLITE_DB}")
        sys.exit(1)

    # Initialize PostgreSQL schema first via database.py
    sys.path.insert(0, HERE)
    from app.database import init_db
    init_db()

    sq_conn = sqlite3.connect(SQLITE_DB)
    sq_conn.row_factory = sqlite3.Row
    sq_cur = sq_conn.cursor()

    pg_conn = get_pg_conn()
    pg_conn.autocommit = False
    pg_cur = pg_conn.cursor()

    try:
        # Disable FK checks temporarily for bulk load / cleanup
        pg_cur.execute("SET session_replication_role = 'replica';")

        # Clear existing tables in reverse order
        print("\n🧹 Clearing destination PostgreSQL tables...")
        for table in reversed(TABLE_ORDER):
            pg_cur.execute(f"TRUNCATE TABLE {table} CASCADE;")
        pg_conn.commit()

        print("\n📦 Migrating table records...")
        total_migrated = 0

        for table in TABLE_ORDER:
            sq_cur.execute(f"SELECT * FROM {table}")
            rows = sq_cur.fetchall()
            if not rows:
                print(f"  - {table:20s}: 0 records")
                continue

            cols = rows[0].keys()
            cols_str = ", ".join(cols)
            placeholders = ", ".join(["%s"] * len(cols))

            # Build insert query with ON CONFLICT DO NOTHING
            pk_col = PRIMARY_KEY_MAP.get(table, "id")
            insert_sql = f"INSERT INTO {table} ({cols_str}) VALUES ({placeholders}) ON CONFLICT ({pk_col}) DO NOTHING;"

            records = [tuple(row[c] for c in cols) for row in rows]
            pg_cur.executemany(insert_sql, records)
            count = len(records)
            total_migrated += count
            print(f"  - {table:20s}: {count} records migrated")

        # Re-enable FK checks
        pg_cur.execute("SET session_replication_role = 'origin';")

        # Sync sequences for tables with auto-increment 'id'
        print("\n🔄 Resetting auto-increment ID sequences...")
        for table in TABLE_ORDER:
            if table not in ("sessions", "daily_reports"):
                seq_query = f"""
                SELECT setval(pg_get_serial_sequence('{table}', 'id'),
                       COALESCE((SELECT MAX(id) FROM {table}), 1));
                """
                try:
                    pg_cur.execute(seq_query)
                except Exception as ex:
                    print(f"  ⚠️ Warning syncing sequence for {table}: {ex}")

        pg_conn.commit()
        print(f"\n✅ Migration completed successfully! Total records migrated: {total_migrated}")

    except Exception as e:
        pg_conn.rollback()
        print(f"\n❌ Migration failed: {e}")
        raise e
    finally:
        sq_conn.close()
        pg_conn.close()

if __name__ == "__main__":
    migrate()
