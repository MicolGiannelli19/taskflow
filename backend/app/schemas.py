from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
import uuid

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    name: str
    avatar: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: uuid.UUID
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
    owner_id: uuid.UUID
    created_at: datetime
    
    class Config:
        from_attributes = True

# Ticket schemas
class TicketBasic(BaseModel):
    id: uuid.UUID
    title: str
    position: int
    priority: str
    assignee_id: Optional[uuid.UUID] = None
    assignee_name: Optional[str] = None
    assignee_avatar: Optional[str] = None
    due_date: Optional[datetime] = None
    created_at: datetime
    
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
class ColumnWithTickets(BaseModel):
    id: uuid.UUID
    name: str
    position: int
    tickets: List[TicketBasic] = []
    
    class Config:
        from_attributes = True

class BoardWithColumns(BoardBase):
    columns: List[ColumnWithTickets] = []
    
    class Config:
        from_attributes = True

class ColumnCreate(BaseModel):
    name: str
    position: int

class ColumnUpdate(BaseModel):
    name: Optional[str] = None
    position: Optional[int] = None

class CommentCreate(BaseModel):
    content: str
