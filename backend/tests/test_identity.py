"""`IdentityService` — the Clerk account → TaskFlow user exchange.

The Clerk *client* is faked here; the database is real (in memory). That split
is what makes the interesting cases testable: how many times Clerk is called,
which local row gets adopted, and what happens when two first requests race.
"""
from types import SimpleNamespace

import pytest

from app.database import User, UserIdentity
from app.exceptions import UnauthorizedError
from app.services.identity_service import CLERK_PROVIDER, IdentityService


# ─── A stand-in for the Clerk Backend API client ─────────────────────────────

def clerk_user(
    user_id="user_2abc",
    email="new@example.com",
    *,
    first_name="New",
    last_name="Person",
    image_url="https://img.clerk.com/new.png",
    extra_emails=(),
):
    """The shape `clerk.users.get()` returns, trimmed to what we read."""
    primary = SimpleNamespace(id="idn_primary", email_address=email)
    others = [
        SimpleNamespace(id=f"idn_{i}", email_address=address)
        for i, address in enumerate(extra_emails)
    ]
    return SimpleNamespace(
        id=user_id,
        # Deliberately not first in the list: the primary is chosen by id, and
        # putting it last would catch an implementation that just takes [0].
        email_addresses=[*others, primary],
        primary_email_address_id="idn_primary",
        first_name=first_name,
        last_name=last_name,
        image_url=image_url,
    )


class FakeClerk:
    """Counts calls, so "did this touch the network?" is assertable."""

    def __init__(self, account=None, *, on_get=None):
        self.account = account
        self.on_get = on_get
        self.calls = 0
        self.users = SimpleNamespace(get=self._get)

    def _get(self, user_id):
        self.calls += 1
        if self.on_get:
            self.on_get()
        return self.account


# ─── The fast path ───────────────────────────────────────────────────────────

def test_a_linked_account_costs_one_query_and_no_network_call(db_session, make_user):
    alice = make_user("alice@example.com", "Alice Johnson", clerk_id="user_alice")
    clerk = FakeClerk()

    resolved = IdentityService(db_session, clerk).resolve("user_alice")

    assert resolved.id == alice.id
    assert clerk.calls == 0, "the Clerk API was called for an already-linked account"


# ─── First sight of an account ───────────────────────────────────────────────

def test_an_unknown_clerk_id_with_a_matching_email_adopts_that_row(
    db_session, make_user
):
    """This is what carries seeded users across the migration.

    The local row already exists (with its boards, tickets and comments); a
    first sign-in through Clerk must link to it, not duplicate it.
    """
    seeded = make_user("alice@example.com", "Alice Johnson")

    clerk = FakeClerk(clerk_user("user_alice", "alice@example.com"))
    resolved = IdentityService(db_session, clerk).resolve("user_alice")

    assert resolved.id == seeded.id
    assert db_session.query(User).count() == 1
    identity = db_session.query(UserIdentity).one()
    assert (identity.provider, identity.provider_id) == (CLERK_PROVIDER, "user_alice")


def test_adoption_fills_blanks_without_overwriting_a_local_name(
    db_session, make_user
):
    """`_provision` only fills blanks — a name set in TaskFlow survives."""
    seeded = make_user("alice@example.com", "Alice Of TaskFlow")

    clerk = FakeClerk(
        clerk_user("user_alice", "alice@example.com", first_name="Alice", last_name="Clerk")
    )
    resolved = IdentityService(db_session, clerk).resolve("user_alice")

    assert resolved.name == "Alice Of TaskFlow"
    # The avatar *was* blank, so Clerk's fills it.
    assert resolved.avatar == "https://img.clerk.com/new.png"


def test_an_unknown_email_creates_a_user(db_session):
    clerk = FakeClerk(clerk_user("user_new", "new@example.com"))

    resolved = IdentityService(db_session, clerk).resolve("user_new")

    assert resolved.email == "new@example.com"
    assert resolved.name == "New Person"
    assert resolved.avatar == "https://img.clerk.com/new.png"
    assert db_session.query(User).count() == 1
    assert clerk.calls == 1


def test_the_second_request_uses_the_cached_link(db_session):
    """After provisioning, Clerk is not consulted again."""
    clerk = FakeClerk(clerk_user("user_new", "new@example.com"))
    service = IdentityService(db_session, clerk)

    first = service.resolve("user_new")
    second = IdentityService(db_session, clerk).resolve("user_new")

    assert first.id == second.id
    assert clerk.calls == 1


def test_the_primary_address_wins_over_the_others(db_session):
    clerk = FakeClerk(
        clerk_user(
            "user_new",
            "primary@example.com",
            extra_emails=("old@example.com", "work@example.com"),
        )
    )

    resolved = IdentityService(db_session, clerk).resolve("user_new")

    assert resolved.email == "primary@example.com"


def test_an_account_with_no_email_is_refused(db_session):
    account = clerk_user("user_new", "irrelevant@example.com")
    account.email_addresses = []
    clerk = FakeClerk(account)

    with pytest.raises(UnauthorizedError):
        IdentityService(db_session, clerk).resolve("user_new")

    assert db_session.query(User).count() == 0


def test_a_name_clerk_does_not_know_stays_empty(db_session):
    clerk = FakeClerk(
        clerk_user("user_new", "new@example.com", first_name=None, last_name=None)
    )

    resolved = IdentityService(db_session, clerk).resolve("user_new")

    assert resolved.name is None


# ─── The race ────────────────────────────────────────────────────────────────

def test_losing_the_provisioning_race_returns_the_winners_row(db_session):
    """Two first requests arrive together; the unique constraint picks one.

    Simulated by having the (slow) Clerk call complete *while another request
    finishes provisioning* — exactly the window the race lives in. Nothing is
    patched: the `IntegrityError` below is the real
    `(provider, provider_id)` constraint firing.
    """
    winner_id = {}

    def other_request_wins_first():
        winner = User(email="new@example.com", name="Winner")
        db_session.add(winner)
        db_session.flush()
        db_session.add(
            UserIdentity(
                user_id=winner.id, provider=CLERK_PROVIDER, provider_id="user_new"
            )
        )
        db_session.commit()
        winner_id["id"] = winner.id

    clerk = FakeClerk(
        clerk_user("user_new", "new@example.com"), on_get=other_request_wins_first
    )

    resolved = IdentityService(db_session, clerk).resolve("user_new")

    assert resolved.id == winner_id["id"]
    assert db_session.query(User).count() == 1
    assert db_session.query(UserIdentity).count() == 1
