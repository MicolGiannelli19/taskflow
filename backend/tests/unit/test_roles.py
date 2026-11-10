"""The role hierarchy, as plain functions: no database, no HTTP.

`require_board_role` and `MembershipService` both lean on these two helpers, so
a mistake here would surface as a wrong 403 somewhere far away. Testing them
directly pins the rule down where it is written.
"""
import pytest

from app.core.authorization import Role, parse_role, role_satisfies
from app.core.exceptions import ValidationError


# ─── role_satisfies: "is this role at least X?" ──────────────────────────────

@pytest.mark.parametrize(
    "stored,minimum,expected",
    [
        ("owner", Role.OWNER, True),
        ("owner", Role.ADMIN, True),
        ("owner", Role.VIEWER, True),
        ("admin", Role.OWNER, False),
        ("admin", Role.ADMIN, True),
        ("admin", Role.MEMBER, True),
        ("member", Role.ADMIN, False),
        ("member", Role.MEMBER, True),
        ("member", Role.VIEWER, True),
        ("viewer", Role.MEMBER, False),
        ("viewer", Role.VIEWER, True),
    ],
)
def test_role_hierarchy(stored, minimum, expected):
    assert role_satisfies(stored, minimum) is expected


@pytest.mark.parametrize("stored", ["", "superuser", "OWNER", None])
def test_unknown_roles_fail_closed(stored):
    """A role the code does not recognise grants nothing, not everything."""
    assert role_satisfies(stored, Role.VIEWER) is False


def test_a_role_enum_is_accepted_as_well_as_its_string():
    # `Role` subclasses `str`, so callers can pass either; both must agree.
    assert role_satisfies(Role.ADMIN, Role.MEMBER) is True


# ─── parse_role: request input → Role ────────────────────────────────────────

@pytest.mark.parametrize("value", [r.value for r in Role])
def test_every_role_name_parses(value):
    assert parse_role(value) == Role(value)


@pytest.mark.parametrize("value", ["", "Owner", "superuser", " admin"])
def test_anything_else_is_a_validation_error(value):
    # Exact match only: "Owner" or " admin" are not quietly normalised, so the
    # stored value can never drift from the four the CHECK constraint allows.
    with pytest.raises(ValidationError) as excinfo:
        parse_role(value)

    # The message lists the valid choices, so a 400 tells the caller how to fix it.
    for role in Role:
        assert role.value in excinfo.value.detail
