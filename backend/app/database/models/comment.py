from sqlalchemy import Column, Text, ForeignKey, TIMESTAMP, Uuid
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database.session import Base


class Comment(Base):
    __tablename__ = "comments"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(Uuid(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

    ticket = relationship("Ticket", back_populates="comments")
