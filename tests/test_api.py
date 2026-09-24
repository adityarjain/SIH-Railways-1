"""Operations API: role sessions, role/department permissions, event log, files."""
import base64
import importlib

import pytest
from fastapi.testclient import TestClient

@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("RMO_DB_PATH", str(tmp_path / "rmo.sqlite3"))
    import api.db
    import api.app
    importlib.reload(api.db)
    app_mod = importlib.reload(api.app)
    with TestClient(app_mod.app) as c:
        yield c


TRD, TRACK = "Electrical / TRD", "Track / Civil Engineering"


def enter(c, role, department=None):
    r = c.post("/api/session", json={"role": role, "department": department})
    assert r.status_code == 200, r.text
    return r.json()


def sign_in(c, username):
    """Open a session as one of the seeded profiles."""
    return {
        "controller": lambda: enter(c, "Authority"),
        "admin": lambda: enter(c, "Admin"),
        "sse_trd": lambda: enter(c, "Ground Operations", TRD),
        "sse_track": lambda: enter(c, "Ground Operations", TRACK),
    }[username]()


def test_health(client):
    assert client.get("/api/health").json()["ok"] is True


def test_role_selection_opens_a_session(client):
    assert client.get("/api/auth/me").status_code == 401
    user = enter(client, "Ground Operations", TRD)
    assert (user["role"], user["department"]) == ("Ground Operations", TRD)
    assert client.get("/api/auth/me").json()["username"] == "sse_trd"
    client.post("/api/auth/logout")
    assert client.get("/api/auth/me").status_code == 401


def test_ground_needs_a_valid_department(client):
    assert client.post("/api/session", json={"role": "Ground Operations"}).status_code == 400
    assert client.post("/api/session", json={"role": "Ground Operations", "department": "Nope"}).status_code == 400
    assert client.post("/api/session", json={"role": "Superuser"}).status_code == 400


def test_no_password_login_remains(client):
    assert client.post("/api/auth/login", json={"username": "admin", "password": "x"}).status_code in (404, 405)


def test_ground_only_reads_its_own_department(client):
    import api.app as app_mod
    track_task = next(t for t, d in app_mod.TASK_DEPT.items() if d == TRACK)
    enter(client, "Ground Operations", TRD)
    client.post("/api/events", json={"kind": "status_changed", "task_id": "TASK-000005", "payload": {"status": "In Progress"}})
    client.post("/api/auth/logout")
    enter(client, "Ground Operations", TRACK)
    client.post("/api/events", json={"kind": "status_changed", "task_id": track_task, "payload": {"status": "In Progress"}})
    client.post("/api/auth/logout")
    enter(client, "Authority")
    client.post("/api/events", json={"kind": "replan_toggled", "payload": {"on": True, "task_id": "TASK-000005"}})
    client.post("/api/events", json={"kind": "event_triggered", "payload": {"event_id": "EVT-001"}})
    assert len(client.get("/api/events").json()) == 4  # authority sees everything
    client.post("/api/auth/logout")

    enter(client, "Ground Operations", TRACK)
    seen = client.get("/api/events").json()
    # Own task + the network-wide disruption; nothing about TRD's task or its replan.
    assert [(e["kind"], e["task_id"]) for e in seen] == [("status_changed", track_task), ("event_triggered", None)]


def test_ground_cannot_open_another_departments_photo(client):
    enter(client, "Ground Operations", TRD)
    jpeg = b"\xff\xd8\xff\xe0" + b"0" * 32
    fid = client.post("/api/files", json={"name": "a.jpg", "data_url": "data:image/jpeg;base64," + base64.b64encode(jpeg).decode()}).json()["id"]
    assert client.get(f"/api/files/{fid}").status_code == 200
    client.post("/api/auth/logout")
    enter(client, "Ground Operations", TRACK)
    assert client.get(f"/api/files/{fid}").status_code == 404
    client.post("/api/auth/logout")
    enter(client, "Authority")
    assert client.get(f"/api/files/{fid}").status_code == 200


def test_role_permissions_on_events(client):
    sign_in(client, "sse_trd")
    # Ground may not record an authority decision.
    r = client.post("/api/events", json={"kind": "decision_recorded", "task_id": "TASK-000005", "payload": {}})
    assert r.status_code == 403
    # Ground may change status on its own department's task...
    r = client.post("/api/events", json={"kind": "status_changed", "task_id": "TASK-000005", "payload": {"status": "In Progress"}})
    assert r.status_code == 201
    assert r.json()["actor"]["username"] == "sse_trd"


def test_ground_cannot_touch_other_departments(client, monkeypatch):
    import api.app as app_mod
    other = next(t for t, d in app_mod.TASK_DEPT.items() if d != "Electrical / TRD")
    sign_in(client, "sse_trd")
    r = client.post("/api/events", json={"kind": "status_changed", "task_id": other, "payload": {"status": "Completed"}})
    assert r.status_code == 403


def test_unknown_kind_and_task_rejected(client):
    sign_in(client, "controller")
    assert client.post("/api/events", json={"kind": "drop_tables", "payload": {}}).status_code == 400
    assert client.post("/api/events", json={"kind": "decision_recorded", "task_id": "TASK-999999", "payload": {}}).status_code == 400


def test_event_log_is_shared_and_ordered(client):
    sign_in(client, "controller")
    client.post("/api/events", json={"kind": "replan_toggled", "payload": {"on": True}})
    client.post("/api/events", json={"kind": "decision_recorded", "task_id": "TASK-000005", "payload": {"decision": "APPROVED"}})
    client.post("/api/auth/logout")
    sign_in(client, "sse_trd")
    events = client.get("/api/events").json()
    assert [e["kind"] for e in events] == ["replan_toggled", "decision_recorded"]
    assert events[0]["id"] < events[1]["id"]


def test_photo_upload_validates_type_and_owner(client):
    sign_in(client, "sse_trd")
    fake = "data:image/png;base64," + base64.b64encode(b"<svg>not a png</svg>").decode()
    assert client.post("/api/files", json={"name": "x.png", "data_url": fake}).status_code == 415
    jpeg = b"\xff\xd8\xff\xe0" + b"0" * 64
    r = client.post("/api/files", json={"name": "site.jpg", "data_url": "data:image/jpeg;base64," + base64.b64encode(jpeg).decode()})
    assert r.status_code == 201
    fid = r.json()["id"]
    assert client.get(f"/api/files/{fid}").content == jpeg
    ok = client.post("/api/events", json={"kind": "evidence_added", "task_id": "TASK-000005", "payload": {"note": "done", "file_id": fid}})
    assert ok.status_code == 201
    bad = client.post("/api/events", json={"kind": "evidence_added", "task_id": "TASK-000005", "payload": {"file_id": fid + 99}})
    assert bad.status_code == 400


def test_alert_seen_only_moves_forward(client):
    sign_in(client, "controller")
    client.post("/api/alerts/seen", json={"last_event_id": 7})
    client.post("/api/alerts/seen", json={"last_event_id": 3})
    assert client.get("/api/alerts/seen").json()["last_event_id"] == 7


def test_reset_is_admin_only(client):
    sign_in(client, "controller")
    client.post("/api/events", json={"kind": "replan_toggled", "payload": {"on": True}})
    assert client.post("/api/admin/reset").status_code == 403
    client.post("/api/auth/logout")
    sign_in(client, "admin")
    assert client.post("/api/admin/reset").status_code == 200
    assert client.get("/api/events").json() == []
