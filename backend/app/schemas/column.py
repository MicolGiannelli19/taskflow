from pydantic import BaseModel
from typing import Optional
import uuid


class ColumnResponse(BaseModel):
    id: uuid.UUID
    name: str
    position: int
    
    class Config:
        from_attributes = True

class ColumnCreate(BaseModel):
    name: str
    # Omitted means "append to the end of the board".
    position: Optional[int] = None

class ColumnUpdate(BaseModel):
    name: Optional[str] = None
    position: Optional[int] = None
