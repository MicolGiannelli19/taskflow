from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid
from app.schemas.column import ColumnResponse
from app.schemas.ticket import TicketBasic


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
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class BoardWithData(BoardBase):
    columns: List[ColumnResponse] = []
    tickets: List[TicketBasic] = []

    class Config:
        from_attributes = True
