from sqlalchemy import Column, String, Integer, Text, ForeignKey, BigInteger, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    avatar = Column(String(500))
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

class Board(Base):
    __tablename__ = "boards"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    columns = relationship("BoardColumn", back_populates="board", cascade="all, delete-orphan")
    tickets = relationship("Ticket", back_populates="board", cascade="all, delete-orphan")

class BoardMember(Base):
    __tablename__ = "board_members"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    board_id = Column(UUID(as_uuid=True), ForeignKey("boards.id", ondelete="CASCADE"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    role = Column(String(50), default="member")
    created_at = Column(TIMESTAMP, default=datetime.utcnow)

class BoardColumn(Base):
    __tablename__ = "board_columns"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    board_id = Column(UUID(as_uuid=True), ForeignKey("boards.id", ondelete="CASCADE"))
    name = Column(String(255), nullable=False)
    position = Column(Integer, nullable=False)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    board = relationship("Board", back_populates="columns")
    tickets = relationship("Ticket", back_populates="column", cascade="all, delete-orphan")

class Ticket(Base):
    __tablename__ = "tickets"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    board_id = Column(UUID(as_uuid=True), ForeignKey("boards.id", ondelete="CASCADE"))
    column_id = Column(UUID(as_uuid=True), ForeignKey("board_columns.id", ondelete="CASCADE"))
    title = Column(String(500), nullable=False)
    description = Column(Text)
    position = Column(Integer, nullable=False)
    priority = Column(String(50), default="medium")
    assignee_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    due_date = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    board = relationship("Board", back_populates="tickets")
    column = relationship("BoardColumn", back_populates="tickets")
    comments = relationship("Comment", back_populates="ticket", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="ticket", cascade="all, delete-orphan")

class Comment(Base):
    __tablename__ = "comments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    content = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    ticket = relationship("Ticket", back_populates="comments")

class Attachment(Base):
    __tablename__ = "attachments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"))
    name = Column(String(500), nullable=False)
    url = Column(String(1000), nullable=False)
    size = Column(BigInteger, nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    
    ticket = relationship("Ticket", back_populates="attachments")

# ============================================
# FILE: schemas.py
# ============================================
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