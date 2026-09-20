from sqlalchemy import Column, String, TIMESTAMP, Uuid
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database.session import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(255), nullable=True)
    avatar = Column(String(500))
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    identities = relationship("UserIdentity", back_populates="user", cascade="all, delete-orphan")
