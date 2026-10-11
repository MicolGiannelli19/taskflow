from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid


# UserCreate and UserProfileUpdate are gone: Clerk owns sign-up and profile
# editing, so nothing posts those shapes to this API any more.
class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    name: Optional[str] = None
    avatar: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class UserSuggestion(BaseModel):
    """A user as offered by the search typeahead.

    Deliberately smaller than UserResponse: picking someone out of a list needs
    a face, a name and an address, not their account's creation date.
    """
    id: uuid.UUID
    email: EmailStr
    name: Optional[str] = None
    avatar: Optional[str] = None

    class Config:
        from_attributes = True
