"""Board authorization primitives.

Defines the four board-membership roles and helpers for comparing them. This is
the single place that knows the role hierarchy — the ``require_board_role``
dependency (``app.dependencies``) and ``MembershipService`` build on it.

See ``docs/specs/authorization-data-model.md`` §5 for the design.
"""
from enum import Enum

from app.core.exceptions import ValidationError


class Role(str, Enum):
    """Board-membership roles, most to least privileged."""
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


# Higher number == more privilege. Used for "role is at least X" checks.
_ROLE_RANK = {
    Role.VIEWER: 0,
    Role.MEMBER: 1,
    Role.ADMIN: 2,
    Role.OWNER: 3,
}


def parse_role(value: str) -> Role:
    """Coerce a string to a ``Role``, raising ``ValidationError`` if unknown."""
    try:
        return Role(value)
    except ValueError:
        allowed = ", ".join(r.value for r in Role)
        raise ValidationError(f"Invalid role '{value}'. Must be one of: {allowed}")


def role_satisfies(role: str, minimum: Role) -> bool:
    """True if the stored ``role`` is at least as privileged as ``minimum``.

    An unrecognised stored value is treated as no access (fail closed).
    """
    try:
        return _ROLE_RANK[Role(role)] >= _ROLE_RANK[minimum]
    except (ValueError, KeyError):
        return False
