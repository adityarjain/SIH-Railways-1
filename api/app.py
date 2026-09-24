"""FastAPI app: role sessions, event log, evidence files, alert read-state.

Run locally:  uvicorn api.app:app --port 8000
The Vite dev server proxies /api here (frontend/vite.config.js).
"""
import base64
import json
import sqlite3
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from . import auth, db

ROOT = Path(__file__).resolve().parent.parent
AUTHORITY, GROUND, ADMIN = "Authority", "Ground Operations", "Admin"
COOKIE = "rmo_session"
MAX_PAYLOAD_BYTES = 8_000
MAX_FILE_BYTES = 3 * 1024 * 1024
IMAGE_MAGIC = {
    "image/jpeg": b"\xff\xd8\xff",
    "image/png": b"\x89PNG\r\n\x1a\n",
    "image/webp": b"RIFF",
}

# Which role may append which kind of event. Mirrors who can press the
# corresponding button in the UI, enforced here so the UI is not the guard.
ALLOWED_KINDS = {
    "status_changed": {GROUND},
    "requirement_submitted": {GROUND},
    "evidence_added": {GROUND},
    "decision_recorded": {AUTHORITY},
    "verification_submitted": {AUTHORITY},
    "replan_toggled": {AUTHORITY},
    "event_triggered": {AUTHORITY},
    "event_cleared": {AUTHORITY},
}

DEPARTMENTS = [
    "Track / Civil Engineering",
    "Electrical / TRD",
    "Signal & Telecommunications (S&T)",
    "Mechanical / Rolling Stock",
]

# Profiles, created on first start: one per role, and one per department for
# Ground so each field department only ever sees its own work.
PROFILES = [
    ("controller", AUTHORITY, "Operations Control", "Divisional Operations Controller"),
    ("admin", ADMIN, "Systems & Verification", "System Administrator"),
    ("sse_track", GROUND, DEPARTMENTS[0], "Senior Section Engineer"),
    ("sse_trd", GROUND, DEPARTMENTS[1], "Senior Section Engineer"),
    ("sse_snt", GROUND, DEPARTMENTS[2], "Senior Section Engineer"),
    ("sse_mech", GROUND, DEPARTMENTS[3], "Senior Section Engineer"),
]


def _task_departments() -> dict[str, str]:
    path = ROOT / "frontend" / "src" / "data" / "tasks_inventory.json"
    with open(path, encoding="utf-8") as f:
        return {t["task_id"]: t["department"] for t in json.load(f)}


TASK_DEPT = _task_departments()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def seed_users() -> None:
    with db.connect() as conn:
        for username, role, dept, name in PROFILES:
            conn.execute(
                "INSERT OR IGNORE INTO users (username, role, department, name) VALUES (?, ?, ?, ?)",
                (username, role, dept, name),
            )


@asynccontextmanager
async def lifespan(_app):
    db.init()
    seed_users()
    yield


app = FastAPI(
    title="Railway Maintenance Operations API", lifespan=lifespan,
    docs_url="/api/docs", openapi_url="/api/openapi.json",
)


# --------------------------------------------------------------- helpers


def _user_dict(row) -> dict:
    return {"username": row["username"], "name": row["name"], "role": row["role"], "department": row["department"]}


def current_user(request: Request):
    token = request.cookies.get(COOKIE)
    if not token:
        raise HTTPException(401, "Not signed in")
    with db.connect() as conn:
        row = conn.execute(
            "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?",
            (auth.token_hash(token), time.time()),
        ).fetchone()
    if not row:
        raise HTTPException(401, "Session expired")
    return row


def require_role(*roles):
    def dep(user=Depends(current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, "Not permitted for this role")
        return user
    return dep


def _event_dict(row) -> dict:
    return {
        "id": row["id"], "ts": row["ts"], "kind": row["kind"], "task_id": row["task_id"],
        "payload": json.loads(row["payload"]),
        "actor": {"username": row["username"], "name": row["name"], "role": row["role"], "department": row["department"]},
    }


# ------------------------------------------------------------------ routes


@app.get("/api/health")
def health():
    return {"ok": True, "service": "rmo-api"}


class SessionBody(BaseModel):
    role: str
    department: str | None = None


@app.post("/api/session")
def open_session(body: SessionBody, request: Request, response: Response):
    """Role selection, not authentication: choosing a role (and, for Ground, a
    department) opens a session as that profile. The session is what scopes
    every read and write below."""
    if body.role == GROUND:
        if body.department not in DEPARTMENTS:
            raise HTTPException(400, "Choose a department")
        where, args = "role = ? AND department = ?", (GROUND, body.department)
    elif body.role in (AUTHORITY, ADMIN):
        where, args = "role = ?", (body.role,)
    else:
        raise HTTPException(400, "Unknown role")
    with db.connect() as conn:
        row = conn.execute(f"SELECT * FROM users WHERE {where} ORDER BY id LIMIT 1", args).fetchone()
        token, token_hash, expires = auth.new_token()
        conn.execute("DELETE FROM sessions WHERE expires_at < ?", (time.time(),))
        conn.execute("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)", (token_hash, row["id"], expires))
    response.set_cookie(
        COOKIE, token, max_age=auth.SESSION_TTL_SECONDS, httponly=True, samesite="lax",
        secure=request.url.scheme == "https", path="/",
    )
    return _user_dict(row)


@app.post("/api/auth/logout")
def logout(request: Request, response: Response):
    token = request.cookies.get(COOKIE)
    if token:
        with db.connect() as conn:
            conn.execute("DELETE FROM sessions WHERE token_hash = ?", (auth.token_hash(token),))
    response.delete_cookie(COOKIE, path="/")
    return {"ok": True}


@app.get("/api/auth/me")
def me(user=Depends(current_user)):
    return _user_dict(user)


@app.get("/api/events")
def list_events(after: int = 0, user=Depends(current_user)):
    # Authority and Admin read the whole log; Ground reads only its own
    # department's part of it. `after` lets the browser poll for what is new.
    with db.connect() as conn:
        rows = conn.execute("SELECT * FROM events WHERE id > ? ORDER BY id", (after,)).fetchall()
    events = [_event_dict(r) for r in rows]
    if user["role"] == GROUND:
        events = [e for e in events if _visible_to_department(e, user["department"])]
    return events


def _visible_to_department(event: dict, department: str) -> bool:
    """A field department sees events about its own tasks, plus network-wide
    events that name no task (a disruption raised or cleared). Nothing about
    another department's work leaves the server."""
    task = event["task_id"] or event["payload"].get("task_id")
    return task is None or TASK_DEPT.get(task) == department


class EventBody(BaseModel):
    kind: str
    task_id: str | None = Field(default=None, max_length=32)
    payload: dict = Field(default_factory=dict)


@app.post("/api/events", status_code=201)
def append_event(body: EventBody, user=Depends(current_user)):
    roles = ALLOWED_KINDS.get(body.kind)
    if roles is None:
        raise HTTPException(400, f"Unknown event kind '{body.kind}'")
    if user["role"] not in roles:
        raise HTTPException(403, "Not permitted for this role")
    payload = json.dumps(body.payload, separators=(",", ":"))
    if len(payload.encode()) > MAX_PAYLOAD_BYTES:
        raise HTTPException(413, "Payload too large")
    if body.task_id is not None:
        if body.task_id not in TASK_DEPT:
            raise HTTPException(400, "Unknown task")
        # Field crews act only on their own department's work.
        if user["role"] == GROUND and TASK_DEPT[body.task_id] != user["department"]:
            raise HTTPException(403, "Task belongs to another department")
    elif user["role"] == GROUND:
        raise HTTPException(400, "Field events must name a task")

    with db.connect() as conn:
        if body.kind == "evidence_added" and body.payload.get("file_id") is not None:
            owner = conn.execute("SELECT uploaded_by FROM files WHERE id = ?", (body.payload["file_id"],)).fetchone()
            if not owner or owner["uploaded_by"] != user["id"]:
                raise HTTPException(400, "Unknown file")
        cur = conn.execute(
            "INSERT INTO events (ts, user_id, username, name, role, department, kind, task_id, payload) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (_now(), user["id"], user["username"], user["name"], user["role"], user["department"],
             body.kind, body.task_id, payload),
        )
        row = conn.execute("SELECT * FROM events WHERE id = ?", (cur.lastrowid,)).fetchone()
    return _event_dict(row)


class FileBody(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    data_url: str = Field(max_length=MAX_FILE_BYTES * 2)


@app.post("/api/files", status_code=201)
def upload_file(body: FileBody, user=Depends(require_role(GROUND))):
    try:
        header, b64 = body.data_url.split(",", 1)
        mime = header.removeprefix("data:").removesuffix(";base64")
        data = base64.b64decode(b64, validate=True)
    except ValueError:
        raise HTTPException(400, "Expected a base64 data URL")
    magic = IMAGE_MAGIC.get(mime)
    if not magic or not data.startswith(magic):
        raise HTTPException(415, "Only JPEG, PNG or WebP photos are accepted")
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(413, "Photo is larger than 3 MB")
    with db.connect() as conn:
        cur = conn.execute(
            "INSERT INTO files (uploaded_by, mime, name, size, data, ts) VALUES (?, ?, ?, ?, ?, ?)",
            (user["id"], mime, body.name, len(data), sqlite3.Binary(data), _now()),
        )
    return {"id": cur.lastrowid, "mime": mime, "size": len(data)}


@app.get("/api/files/{file_id}")
def get_file(file_id: int, user=Depends(current_user)):
    with db.connect() as conn:
        row = conn.execute(
            "SELECT f.mime, f.data, u.department FROM files f JOIN users u ON u.id = f.uploaded_by WHERE f.id = ?",
            (file_id,),
        ).fetchone()
    # A field department cannot open another department's photos.
    if not row or (user["role"] == GROUND and row["department"] != user["department"]):
        raise HTTPException(404, "Not found")
    return Response(
        bytes(row["data"]), media_type=row["mime"],
        headers={"Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff"},
    )


@app.get("/api/alerts/seen")
def alerts_seen(user=Depends(current_user)):
    with db.connect() as conn:
        row = conn.execute("SELECT last_event_id FROM alert_seen WHERE user_id = ?", (user["id"],)).fetchone()
    return {"last_event_id": row["last_event_id"] if row else 0}


class SeenBody(BaseModel):
    last_event_id: int = Field(ge=0)


@app.post("/api/alerts/seen")
def mark_seen(body: SeenBody, user=Depends(current_user)):
    with db.connect() as conn:
        conn.execute(
            "INSERT INTO alert_seen (user_id, last_event_id) VALUES (?, ?) "
            "ON CONFLICT(user_id) DO UPDATE SET last_event_id = MAX(last_event_id, excluded.last_event_id)",
            (user["id"], body.last_event_id),
        )
    return {"ok": True}


@app.post("/api/admin/reset")
def reset(user=Depends(require_role(ADMIN))):
    """Clears saved actions and photos so a demo can start clean. Accounts stay."""
    with db.connect() as conn:
        conn.execute("DELETE FROM events")
        conn.execute("DELETE FROM files")
        conn.execute("DELETE FROM alert_seen")
    return {"ok": True}


# Single-host deploy: when a built frontend exists, serve it from the same
# origin so the session cookie needs no cross-site settings.
DIST = ROOT / "frontend" / "dist"
if DIST.is_dir():
    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        if path.startswith("api/"):
            raise HTTPException(404, "Not found")
        target = (DIST / path).resolve()
        if path and target.is_file() and DIST.resolve() in target.parents:
            return FileResponse(target)
        return FileResponse(DIST / "index.html")
