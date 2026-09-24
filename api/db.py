"""SQLite storage. One file, created on first use; path from RMO_DB_PATH."""
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(os.environ.get("RMO_DB_PATH", Path(__file__).resolve().parent.parent / "api_data" / "rmo.sqlite3"))

SCHEMA = """
-- One profile per role (and per department for Ground). Choosing a role on
-- the entry screen opens a session as that profile; there are no passwords.
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY,
    username      TEXT UNIQUE NOT NULL,
    role          TEXT NOT NULL,
    department    TEXT,
    name          TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    expires_at REAL NOT NULL
);
-- Append-only: every state change in the app is one row here. The browser
-- rebuilds its state by replaying these in id order; the audit history and
-- alerts read the same rows.
CREATE TABLE IF NOT EXISTS events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ts         TEXT NOT NULL,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    username   TEXT NOT NULL,
    name       TEXT NOT NULL,
    role       TEXT NOT NULL,
    department TEXT,
    kind       TEXT NOT NULL,
    task_id    TEXT,
    payload    TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS files (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    uploaded_by INTEGER NOT NULL REFERENCES users(id),
    mime        TEXT NOT NULL,
    name        TEXT NOT NULL,
    size        INTEGER NOT NULL,
    data        BLOB NOT NULL,
    ts          TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS alert_seen (
    user_id       INTEGER PRIMARY KEY REFERENCES users(id),
    last_event_id INTEGER NOT NULL
);
"""


def init(path: Path | None = None) -> None:
    p = Path(path or DB_PATH)
    p.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(p) as conn:
        conn.executescript(SCHEMA)


@contextmanager
def connect(path: Path | None = None):
    conn = sqlite3.connect(path or DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
