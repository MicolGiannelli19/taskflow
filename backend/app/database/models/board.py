from sqlalchemy import Column, String, Text, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.database.session import Base


class Board(Base):
    __tablename__ = "boards"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

    # No owner_id: ownership is a board_members row with role='owner' — the
    # single source of truth for access (spec Decision 1).
    members = relationship("BoardMember", cascade="all, delete-orphan")
    columns = relationship("BoardColumn", back_populates="board", cascade="all, delete-orphan")
    tickets = relationship("Ticket", back_populates="board", cascade="all, delete-orphan")
