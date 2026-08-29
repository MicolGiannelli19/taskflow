"""SQLAlchemy ORM models.

One model per module. Every model is imported here so it registers on
``Base.metadata`` when ``app.database.models`` is imported, regardless of which
model a caller actually references.
"""

from app.database.models.user import User
from app.database.models.user_identity import UserIdentity
from app.database.models.board import Board
from app.database.models.board_member import BoardMember
from app.database.models.column import BoardColumn
from app.database.models.ticket import Ticket
from app.database.models.comment import Comment

__all__ = [
    "User",
    "UserIdentity",
    "Board",
    "BoardMember",
    "BoardColumn",
    "Ticket",
    "Comment",
]
