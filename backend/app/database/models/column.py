from sqlalchemy import Column, String, Integer, ForeignKey, TIMESTAMP, Uuid
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database.session import Base


class BoardColumn(Base):
    __tablename__ = "columns"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    board_id = Column(Uuid(as_uuid=True), ForeignKey("boards.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    position = Column(Integer, nullable=False)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

    board = relationship("Board", back_populates="columns")
    tickets = relationship("Ticket", back_populates="column", cascade="all, delete-orphan")
