"""`POST /api/webhooks/clerk` (spec §7).

The signature *is* the authentication on this route, so most of what follows
is about refusing deliveries rather than applying them. Payloads are signed
here with the same Svix primitive Clerk signs with, so verification runs for
real — nothing is stubbed out.
"""
import base64
import json
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from svix.webhooks import Webhook

from app.database import User, UserIdentity, get_db
from app.main import app

SIGNING_SECRET = "whsec_" + base64.b64encode(b"0123456789abcdef0123456789abcdef").decode()


@pytest.fixture
def webhook_client(db_session, monkeypatch):
    """A client for the webhook route, with a known signing secret.

    No `get_current_user` override: this endpoint has no signed-in user, and
    that is exactly the property under test.
    """
    monkeypatch.setattr(
        "app.routers.webhook.settings.clerk_webhook_signing_secret", SIGNING_SECRET
    )
    app.dependency_overrides[get_db] = lambda: db_session
    yield TestClient(app)
    app.dependency_overrides.clear()


def signed(payload: dict, *, secret: str = SIGNING_SECRET, msg_id: str = "msg_1",
           timestamp: datetime | None = None) -> tuple[str, dict]:
    """A body and the headers Clerk would send with it."""
    body = json.dumps(payload)
    when = timestamp or datetime.now(tz=timezone.utc)
    signature = Webhook(secret).sign(msg_id=msg_id, timestamp=when, data=body)
    return body, {
        "svix-id": msg_id,
        "svix-timestamp": str(int(when.timestamp())),
        "svix-signature": signature,
        "content-type": "application/json",
    }


def user_updated(clerk_id: str, *, first="Renamed", last="Person",
                 image="https://img.clerk.com/new.png") -> dict:
    return {
        "type": "user.updated",
        "data": {
            "id": clerk_id,
            "first_name": first,
            "last_name": last,
            "image_url": image,
            "email_addresses": [
                {"id": "idn_1", "email_address": "alice@example.com"}
            ],
            "primary_email_address_id": "idn_1",
        },
    }


def post(client: TestClient, body: str, headers: dict):
    return client.post("/api/webhooks/clerk", content=body, headers=headers)


# ─── Refusing deliveries ─────────────────────────────────────────────────────

def test_an_invalid_signature_is_rejected_and_writes_nothing(
    webhook_client, db_session, make_user
):
    alice = make_user("alice@example.com", "Alice Johnson", clerk_id="user_alice")

    body, headers = signed(user_updated("user_alice"))
    headers["svix-signature"] = "v1,not-a-real-signature"

    response = post(webhook_client, body, headers)

    assert response.status_code == 400
    db_session.refresh(alice)
    assert alice.name == "Alice Johnson", "a rejected webhook still wrote to the database"


def test_a_signature_from_the_wrong_secret_is_rejected(webhook_client, make_user):
    make_user("alice@example.com", "Alice Johnson", clerk_id="user_alice")
    other_secret = "whsec_" + base64.b64encode(b"ffffffffffffffffffffffffffffffff").decode()

    body, headers = signed(user_updated("user_alice"), secret=other_secret)

    assert post(webhook_client, body, headers).status_code == 400


def test_a_tampered_body_is_rejected(webhook_client, db_session, make_user):
    """The signature covers the bytes, so editing the payload invalidates it."""
    alice = make_user("alice@example.com", "Alice Johnson", clerk_id="user_alice")

    body, headers = signed(user_updated("user_alice"))
    tampered = body.replace("Renamed", "Hacked!")

    assert post(webhook_client, tampered, headers).status_code == 400
    db_session.refresh(alice)
    assert alice.name == "Alice Johnson"


def test_an_unsigned_delivery_is_rejected(webhook_client, make_user):
    make_user("alice@example.com", "Alice Johnson", clerk_id="user_alice")

    response = webhook_client.post(
        "/api/webhooks/clerk", json=user_updated("user_alice")
    )

    assert response.status_code == 400


def test_an_old_delivery_is_rejected(webhook_client, make_user):
    """Svix timestamps bound the replay window — an hour-old body is refused."""
    make_user("alice@example.com", "Alice Johnson", clerk_id="user_alice")
    stale = datetime.now(tz=timezone.utc) - timedelta(hours=1)

    body, headers = signed(user_updated("user_alice"), timestamp=stale)

    assert post(webhook_client, body, headers).status_code == 400


def test_without_a_signing_secret_the_endpoint_refuses_everything(
    db_session, monkeypatch, make_user
):
    """Fail closed: unconfigured must not mean unverified."""
    monkeypatch.setattr(
        "app.routers.webhook.settings.clerk_webhook_signing_secret", ""
    )
    app.dependency_overrides[get_db] = lambda: db_session
    try:
        client = TestClient(app)
        make_user("alice@example.com", "Alice Johnson", clerk_id="user_alice")
        body, headers = signed(user_updated("user_alice"))

        # 503, not 2xx: Clerk retries, and the misconfiguration is visible.
        assert post(client, body, headers).status_code == 503
    finally:
        app.dependency_overrides.clear()


# ─── Applying deliveries ─────────────────────────────────────────────────────

def test_user_updated_refreshes_the_local_name_and_avatar(
    webhook_client, db_session, make_user
):
    alice = make_user(
        "alice@example.com", "Alice Johnson",
        avatar="https://img.clerk.com/old.png", clerk_id="user_alice",
    )

    body, headers = signed(
        user_updated("user_alice", first="Alice", last="Renamed")
    )
    response = post(webhook_client, body, headers)

    assert response.status_code == 204
    db_session.refresh(alice)
    assert alice.name == "Alice Renamed"
    assert alice.avatar == "https://img.clerk.com/new.png"


def test_the_new_name_is_what_other_members_see(
    webhook_client, db_session, as_user, board, ticket, member, admin, make_user
):
    """The whole point of the webhook, asserted end to end.

    A member comments, renames themselves in Clerk, and another member's next
    read of the ticket shows the new name — with no re-sign-in anywhere.
    """
    db_session.add(
        UserIdentity(user_id=member.id, provider="clerk", provider_id="user_member")
    )
    db_session.commit()

    as_user(member).post(
        f"/api/boards/{board.id}/tickets/{ticket.id}/comments",
        json={"content": "Before the rename"},
    )
    before = as_user(admin).get(f"/api/boards/{board.id}/tickets/{ticket.id}").json()
    assert before["comments"][0]["user_name"] == "Mia Member"

    body, headers = signed(user_updated("user_member", first="Mia", last="Renamed"))
    assert post(webhook_client, body, headers).status_code == 204

    after = as_user(admin).get(f"/api/boards/{board.id}/tickets/{ticket.id}").json()
    assert after["comments"][0]["user_name"] == "Mia Renamed"


def test_replaying_the_same_event_leaves_the_same_state(
    webhook_client, db_session, make_user
):
    """At-least-once delivery: the second copy must change nothing."""
    alice = make_user("alice@example.com", "Alice Johnson", clerk_id="user_alice")
    body, headers = signed(user_updated("user_alice", first="Alice", last="Renamed"))

    assert post(webhook_client, body, headers).status_code == 204
    db_session.refresh(alice)
    first_state = (alice.name, alice.avatar)

    assert post(webhook_client, body, headers).status_code == 204
    db_session.refresh(alice)

    assert (alice.name, alice.avatar) == first_state
    assert db_session.query(User).count() == 1


def test_an_empty_name_does_not_blank_the_local_one(
    webhook_client, db_session, make_user
):
    alice = make_user("alice@example.com", "Alice Johnson", clerk_id="user_alice")

    body, headers = signed(user_updated("user_alice", first=None, last=None))
    assert post(webhook_client, body, headers).status_code == 204

    db_session.refresh(alice)
    assert alice.name == "Alice Johnson"


def test_an_event_for_an_unlinked_account_is_acknowledged_and_ignored(
    webhook_client, db_session
):
    """Normal traffic: Clerk sends events for accounts that never called us."""
    body, headers = signed(user_updated("user_stranger"))

    assert post(webhook_client, body, headers).status_code == 204
    assert db_session.query(User).count() == 0


def test_user_deleted_removes_the_link_but_keeps_the_profile(
    webhook_client, db_session, make_user, board, ticket, as_user, member
):
    """Authorship survives; access does not (spec §12, question 1)."""
    db_session.add(
        UserIdentity(user_id=member.id, provider="clerk", provider_id="user_member")
    )
    db_session.commit()
    as_user(member).post(
        f"/api/boards/{board.id}/tickets/{ticket.id}/comments",
        json={"content": "Still here after the account is gone"},
    )

    body, headers = signed(
        {"type": "user.deleted", "data": {"id": "user_member", "deleted": True}}
    )
    assert post(webhook_client, body, headers).status_code == 204

    # The link is gone: nothing can authenticate as this user any more.
    assert (
        db_session.query(UserIdentity)
        .filter(UserIdentity.provider_id == "user_member")
        .count() == 0
    )
    # The profile and their comment are not.
    assert db_session.query(User).filter(User.id == member.id).count() == 1
    detail = as_user(member).get(f"/api/boards/{board.id}/tickets/{ticket.id}").json()
    assert detail["comments"][0]["user_name"] == "Mia Member"


def test_replaying_a_delete_is_a_no_op(webhook_client, db_session, make_user):
    make_user("alice@example.com", "Alice Johnson", clerk_id="user_alice")
    body, headers = signed({"type": "user.deleted", "data": {"id": "user_alice"}})

    assert post(webhook_client, body, headers).status_code == 204
    assert post(webhook_client, body, headers).status_code == 204
    assert db_session.query(User).count() == 1


def test_unhandled_events_are_acknowledged(webhook_client):
    """A non-2xx here would make Clerk retry an event we will never act on."""
    body, headers = signed({"type": "session.created", "data": {"id": "sess_1"}})

    assert post(webhook_client, body, headers).status_code == 204


def test_the_webhook_needs_no_session_token(webhook_client, make_user):
    """It is public by design — `get_current_user` never runs on this route.

    If it did, every delivery would 401, since Clerk sends no session token.
    """
    make_user("alice@example.com", "Alice Johnson", clerk_id="user_alice")
    body, headers = signed(user_updated("user_alice"))
    assert "authorization" not in {k.lower() for k in headers}

    assert post(webhook_client, body, headers).status_code == 204
