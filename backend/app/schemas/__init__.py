"""Pydantic request/response schemas.

One module per entity, mirroring ``app.database.models``. Every public schema
is re-exported here so callers keep importing the flat form,
``from app.schemas import X``.
"""

from app.schemas.user import UserResponse, UserSuggestion
from app.schemas.board import BoardCreate, BoardUpdate, BoardBase, BoardWithData
from app.schemas.member import MemberAdd, MemberRoleUpdate, MemberResponse
from app.schemas.column import ColumnCreate, ColumnUpdate, ColumnResponse
from app.schemas.ticket import (
    TicketBasic,
    TicketCreate,
    TicketUpdate,
    TicketDetailed,
    AttachmentResponse,
)
from app.schemas.comment import (
    CommentCreate,
    CommentUpdate,
    CommentResponse,
    COMMENT_MAX_LENGTH,
)

__all__ = [
    "UserResponse",
    "UserSuggestion",
    "BoardCreate",
    "BoardUpdate",
    "BoardBase",
    "BoardWithData",
    "MemberAdd",
    "MemberRoleUpdate",
    "MemberResponse",
    "ColumnCreate",
    "ColumnUpdate",
    "ColumnResponse",
    "TicketBasic",
    "TicketCreate",
    "TicketUpdate",
    "TicketDetailed",
    "AttachmentResponse",
    "CommentCreate",
    "CommentUpdate",
    "CommentResponse",
    "COMMENT_MAX_LENGTH",
]
