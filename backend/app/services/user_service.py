import logging
from typing import List

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import User

logger = logging.getLogger(__name__)

# Enough to fill a suggestion list without turning it into a directory dump.
SEARCH_LIMIT = 8


def _escape_like(value: str) -> str:
    r"""Neutralise LIKE wildcards so a query of "%" matches nobody, not everybody."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class UserService:
    """Read-only lookups over the user directory."""

    def __init__(self, db: Session):
        self.db = db

    def search(self, query: str) -> List[User]:
        """Users whose name or email contains ``query``, case-insensitively.

        Ordered by name so the list is stable between keystrokes, and capped:
        a suggestion list is for recognising someone you already know of, not
        for browsing everyone.
        """
        term = query.strip()
        if not term:
            return []

        pattern = f"%{_escape_like(term)}%"
        return (
            self.db.query(User)
            .filter(
                or_(
                    User.name.ilike(pattern, escape="\\"),
                    User.email.ilike(pattern, escape="\\"),
                )
            )
            .order_by(User.name, User.email)
            .limit(SEARCH_LIMIT)
            .all()
        )
