"""Database layer.

Holds the database structure: the engine/session setup (``session``) and the
SQLAlchemy ORM models (``models``). Import connection helpers and models
directly from this package, e.g. ``from app.database import Base, get_db, User``.

Primary keys use SQLAlchemy's dialect-agnostic ``Uuid`` type rather than
``postgresql.UUID``. Postgres still gets a native ``uuid`` column — identical
DDL — while SQLite gets ``CHAR(32)``, which is what lets the test suite build
the whole schema in memory (``tests/conftest.py``).
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
