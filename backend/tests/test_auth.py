"""`GET /api/auth/me` and the authentication boundary.

**What is not covered here, deliberately (spec §4.4).** Clerk's own token
verification — the RS256 signature check, JWKS fetching and caching, expiry,
and the `azp` (authorized party) check — belongs to the Clerk SDK and is
exercised by its tests, not ours. Every test below either overrides
`get_current_user` or stubs the Clerk client, so a wrong
`clerk_authorized_parties` in `app/config.py` would **not** fail this suite.
Treat that config line as unverified by tests; §6.1 of the spec covers it.

What *is* covered: that a protected route refuses an unauthenticated caller,
that `get_current_user`'s own rejection branches raise 401, and that a signed-in
caller gets their TaskFlow user back — not their Clerk one.
"""
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app


def _client_with_clerk_state(db_session, monkeypatch, **state) -> TestClient:
    """A client whose Clerk verification returns a canned `RequestState`.

    Only the attributes `get_current_user` actually reads are supplied, which is
    what keeps this a stub rather than a reimplementation of Clerk.
    """
    request_state = SimpleNamespace(
        **{"is_signed_in": False, "reason": None, "message": None, "payload": None, **state}
    )

    def _stub_clerk():
        return SimpleNamespace(
            authenticate_request=lambda request, options: request_state
        )

    monkeypatch.setattr("app.dependencies.get_clerk", _stub_clerk)
    app.dependency_overrides[get_db] = lambda: db_session
    return TestClient(app)


def test_me_returns_the_local_user(as_user, owner):
    """`sub` is a Clerk id; what comes back is the TaskFlow row."""
    response = as_user(owner).get("/api/auth/me")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(owner.id)
    assert body["email"] == "owner@example.com"
    assert body["name"] == "Olivia Owner"


def test_me_requires_authentication(unauthenticated):
    response = unauthenticated.get("/api/auth/me")

    assert response.status_code == 401
    assert response.json()["error"] == "Unauthorized"
    assert response.headers["www-authenticate"] == "Bearer"


def test_protected_routes_reject_anonymous_callers(unauthenticated):
    """The 401 is the dependency's, not a per-route check."""
    assert unauthenticated.get("/api/boards").status_code == 401
    assert unauthenticated.post("/api/boards", json={"name": "x"}).status_code == 401
    assert unauthenticated.get("/api/users/search?q=al").status_code == 401


def test_token_without_sub_claim_is_rejected(db_session, monkeypatch):
    """A verified token still needs the claim that identifies the account.

    Clerk says "signed in" but hands over no `sub`, so there is nothing to
    exchange for a local user — that must fail closed, not fall through.
    """
    client = _client_with_clerk_state(
        db_session, monkeypatch, is_signed_in=True, payload={}
    )
    try:
        response = client.get("/api/auth/me")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 401


def test_root_is_public(unauthenticated):
    response = unauthenticated.get("/")

    assert response.status_code == 200
    assert response.json() == {"message": "taskflow API is running"}
