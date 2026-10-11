from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid


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
    # When the membership was created, not the user account.
    joined_at: Optional[datetime] = None

    class Config:
        from_attributes = True
