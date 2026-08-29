"""Database layer.

Holds the database structure: the engine/session setup (``session``) and the
SQLAlchemy ORM models (``models``). Import connection helpers and models
directly from this package, e.g. ``from app.database import Base, get_db, User``.
"""

from app.database.session import Base, SessionLocal, engine, get_db
from app.database.models import (
    User,
    UserIdentity,
    Board,
    BoardMember,
    BoardColumn,
    Ticket,
    Comment,
)

__all__ = [
    "Base",
    "SessionLocal",
    "engine",
    "get_db",
    "User",
    "UserIdentity",
    "Board",
    "BoardMember",
    "BoardColumn",
    "Ticket",
    "Comment",
]
