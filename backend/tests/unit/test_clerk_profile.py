"""Reading a Clerk user object: which email, which name.

These helpers only read attributes, so a `SimpleNamespace` with the same
attribute names stands in for the SDK's `User` model. That is a *fake* (a
real, tiny object) rather than a *mock* (an object that records calls): there
are no calls to check here, only data to read.
"""
from types import SimpleNamespace

import pytest

from app.services.identity_service import _display_name, _primary_email


def clerk_user(*, emails=(), primary_id=None, first_name=None, last_name=None):
    return SimpleNamespace(
        email_addresses=[
            SimpleNamespace(id=f"idn_{i}", email_address=email)
            for i, email in enumerate(emails)
        ],
        primary_email_address_id=primary_id,
        first_name=first_name,
        last_name=last_name,
    )


# ─── _primary_email ──────────────────────────────────────────────────────────

def test_the_primary_address_is_chosen_wherever_it_sits():
    user = clerk_user(emails=["old@example.com", "main@example.com"], primary_id="idn_1")

    assert _primary_email(user) == "main@example.com"


def test_without_a_matching_primary_the_first_address_is_used():
    user = clerk_user(emails=["first@example.com", "second@example.com"], primary_id="idn_missing")

    assert _primary_email(user) == "first@example.com"


@pytest.mark.parametrize("addresses", [[], None])
def test_no_addresses_means_no_email(addresses):
    user = clerk_user()
    user.email_addresses = addresses

    assert _primary_email(user) is None


# ─── _display_name ───────────────────────────────────────────────────────────

@pytest.mark.parametrize(
    "first,last,expected",
    [
        ("Ada", "Lovelace", "Ada Lovelace"),
        ("Ada", None, "Ada"),
        (None, "Lovelace", "Lovelace"),
        ("", "Lovelace", "Lovelace"),
        # No name at all is None, not "" — a stored "" would read as a name.
        (None, None, None),
        ("", "", None),
    ],
)
def test_display_name(first, last, expected):
    assert _display_name(clerk_user(first_name=first, last_name=last)) == expected
