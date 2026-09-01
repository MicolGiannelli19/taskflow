from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
import uuid

# User schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None

class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    name: Optional[str] = None
    avatar: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Board schemas
class BoardCreate(BaseModel):
    name: str
    description: Optional[str] = None

class BoardUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class BoardBase(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Board membership schemas
class MemberAdd(BaseModel):
    email: EmailStr
    role: str = "member"

class MemberRoleUpdate(BaseModel):
    role: str

class MemberResponse(BaseModel):
    user_id: uuid.UUID
    email: EmailStr
    name: Optional[str] = None
    avatar: Optional[str] = None
    role: str

    class Config:
        from_attributes = True

# Ticket schemas
# TODO: you should normaize schema so tickets have column id
class TicketBasic(BaseModel):
    id: uuid.UUID
    board_id: uuid.UUID
    column_id: uuid.UUID
    title: str
    priority: str
    assignee_id: Optional[uuid.UUID] = None
    assignee_avatar: Optional[str] = None
    due_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class TicketCreate(BaseModel):
    column_id: uuid.UUID
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "medium"
    assignee_id: Optional[uuid.UUID] = None
    due_date: Optional[datetime] = None

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[uuid.UUID] = None
    due_date: Optional[datetime] = None
    column_id: Optional[uuid.UUID] = None
    position: Optional[int] = None

class AttachmentResponse(BaseModel):
    id: uuid.UUID
    name: str
    url: str
    size: int
    uploaded_at: datetime
    
    class Config:
        from_attributes = True

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

class TicketDetailed(BaseModel):
    id: uuid.UUID
    board_id: uuid.UUID
    column_id: uuid.UUID
    title: str
    description: Optional[str] = None
    position: int
    priority: str
    assignee_id: Optional[uuid.UUID] = None
    assignee: Optional[UserResponse] = None
    creator_id: uuid.UUID
    creator: Optional[UserResponse] = None
    due_date: Optional[datetime] = None
    attachments: List[AttachmentResponse] = []
    comments: List[CommentResponse] = []
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Column schemas
class ColumnResponse(BaseModel):
    id: uuid.UUID
    name: str
    position: int
    
    class Config:
        from_attributes = True

class BoardWithData(BoardBase):
    columns: List[ColumnResponse] = []
    tickets: List[TicketBasic] = []

    class Config:
        from_attributes = True

class ColumnCreate(BaseModel):
    name: str
    # Omitted means "append to the end of the board".
    position: Optional[int] = None

class ColumnUpdate(BaseModel):
    name: Optional[str] = None
    position: Optional[int] = None

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
