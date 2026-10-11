from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
import uuid


class CommentResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    user_name: str
    user_avatar: Optional[str] = None
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# `comments.content` is TEXT, so the database imposes no limit of its own.
COMMENT_MAX_LENGTH = 5000


def _clean_comment(value: str) -> str:
    """Trim a comment body and reject the empty and the enormous."""
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("Comment cannot be empty")
    if len(cleaned) > COMMENT_MAX_LENGTH:
        raise ValueError(
            f"Comment cannot be longer than {COMMENT_MAX_LENGTH} characters"
        )
    return cleaned


class CommentCreate(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def content_not_blank(cls, v: str) -> str:
        return _clean_comment(v)


class CommentUpdate(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def content_not_blank(cls, v: str) -> str:
        return _clean_comment(v)
