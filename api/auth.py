"""Session tokens, stdlib only.

A random token in an HttpOnly cookie; only its SHA-256 is stored, so a copied
database cannot be used to take over a session.
"""
import hashlib
import secrets
import time

SESSION_TTL_SECONDS = 12 * 60 * 60


def new_token() -> tuple[str, str, float]:
    """Returns (token for the cookie, hash for the database, expiry)."""
    token = secrets.token_urlsafe(32)
    return token, token_hash(token), time.time() + SESSION_TTL_SECONDS


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
