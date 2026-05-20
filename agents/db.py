import sqlite3
from pathlib import Path

BASE = Path(__file__).parent.parent
IDEAS_DB   = BASE / "data" / "ideas.db"
METRICS_DB = BASE / "data" / "metrics.db"

def get_ideas_conn():
    conn = sqlite3.connect(IDEAS_DB)
    conn.row_factory = sqlite3.Row
    return conn

def get_metrics_conn():
    conn = sqlite3.connect(METRICS_DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_ideas_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ideas (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                hash       TEXT UNIQUE NOT NULL,
                title      TEXT NOT NULL,
                source     TEXT,
                topic      TEXT,
                language   TEXT DEFAULT 'it',
                status     TEXT DEFAULT 'raw',
                created_at TEXT DEFAULT (datetime('now')),
                used_at    TEXT
            )
        """)
    with get_metrics_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS metrics (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                video_id   TEXT NOT NULL,
                platform   TEXT NOT NULL,
                post_id    TEXT,
                views      INTEGER DEFAULT 0,
                likes      INTEGER DEFAULT 0,
                comments   INTEGER DEFAULT 0,
                shares     INTEGER DEFAULT 0,
                fetched_at TEXT DEFAULT (datetime('now'))
            )
        """)

if __name__ == "__main__":
    init_db()
    print("DBs initialized OK")
