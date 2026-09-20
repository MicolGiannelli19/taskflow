from sqlalchemy import Column, String, ForeignKey, TIMESTAMP, UniqueConstraint, Uuid
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database.session import Base


class UserIdentity(Base):
    __tablename__ = "user_identities"
    __table_args__ = (UniqueConstraint('provider', 'provider_id'),)
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False)
    provider_id = Column(String(255), nullable=False)
    password_hash = Column(String(255))
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    user = relationship("User", back_populates="identities")
