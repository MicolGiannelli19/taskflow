"""
Kanban App - FastAPI Project Structure

Project Structure:
kanban-app/
├── main.py                 # FastAPI app entry point
├── config.py              # Configuration
├── database.py            # Database connection
├── models.py              # SQLAlchemy models
├── schemas.py             # Pydantic schemas
├── auth.py                # Authentication utilities
├── dependencies.py        # Dependency injection
├── routers/               # API route modules
│   ├── __init__.py
│   ├── auth.py
│   ├── boards.py
│   ├── tickets.py
│   ├── columns.py
│   └── comments.py
└── requirements.txt       # Dependencies

# ============================================
# FILE: routers/tickets.py
# ============================================
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
from database import get_db
from models import Ticket, User, Attachment, Comment
from schemas import (TicketCreate, TicketUpdate, TicketDetailed, UserResponse,
                     AttachmentResponse, CommentResponse)
from dependencies import get_current_user

router = APIRouter(prefix="/api/boards/{board_id}/tickets", tags=["tickets"])

@router.get("/{ticket_id}", response_model=TicketDetailed)
def get_ticket(board_id: uuid.UUID, ticket_id: uuid.UUID, 
               current_user: User = Depends(get_current_user), 
               db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.board_id == board_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    assignee =