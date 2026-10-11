from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid
from app.schemas.user import UserResponse
from app.schemas.comment import CommentResponse


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
