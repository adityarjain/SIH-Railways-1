"""Operations API: sign-in, the shared event log, alerts and evidence files.

A small FastAPI + SQLite service that turns the demo's browser-only session
state into shared, persisted state. It does not run the optimizer; plans still
come from the committed optimizer artifacts.
"""
