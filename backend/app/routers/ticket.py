from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
from app.database import get_db
from app.models import Ticket, User, Attachment, Comment
from app.schemas import (TicketCreate, TicketUpdate, TicketDetailed, UserResponse,
                     AttachmentResponse, CommentResponse)
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/boards/{board_id}/tickets", tags=["tickets"])

@router.get("/{ticket_id}", response_model=TicketDetailed)
def get_ticket(board_id: uuid.UUID, ticket_id: uuid.UUID, 
               current_user: User = Depends(get_current_user), 
               db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.board_id == board_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    assignee = db.query(User).filter(User.id == ticket.assignee_id).first() if ticket.assignee_id else None
    creator = db.query(User).filter(User.id == ticket.creator_id).first()
    
    attachments = db.query(Attachment).filter(Attachment.ticket_id == ticket_id).all()
    attachment_responses = [
        AttachmentResponse(
            id=a.id, name=a.name, url=a.url, size=a.size, uploaded_at=a.created_at
        ) for a in attachments
    ]
    
    comments = db.query(Comment).filter(Comment.ticket_id == ticket_id).order_by(Comment.created_at).all()
    comment_responses = []
    for c in comments:
        user = db.query(User).filter(User.id == c.user_id).first()
        comment_responses.append(CommentResponse(
            id=c.id, user_id=c.user_id, user_name=user.name if user else "Unknown",
            user_avatar=user.avatar if user else None, content=c.content, created_at=c.created_at
        ))
    
    return TicketDetailed(
        id=ticket.id, board_id=ticket.board_id, column_id=ticket.column_id,
        title=ticket.title, description=ticket.description, position=ticket.position,
        priority=ticket.priority, assignee_id=ticket.assignee_id,
        assignee=UserResponse.from_orm(assignee) if assignee else None,
        creator_id=ticket.creator_id, creator=UserResponse.from_orm(creator) if creator else None,
        due_date=ticket.due_date, attachments=attachment_responses, comments=comment_responses,
        created_at=ticket.created_at, updated_at=ticket.updated_at
    )

@router.post("")
def create_ticket(board_id: uuid.UUID, ticket: TicketCreate,
                  current_user: User = Depends(get_current_user), 
                  db: Session = Depends(get_db)):
    max_position = db.query(Ticket).filter(Ticket.column_id == ticket.column_id).count()
    
    new_ticket = Ticket(
        board_id=board_id, column_id=ticket.column_id, title=ticket.title,
        description=ticket.description, position=max_position, priority=ticket.priority,
        assignee_id=ticket.assignee_id, creator_id=current_user.id, due_date=ticket.due_date
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    return new_ticket

@router.patch("/{ticket_id}")
def update_ticket(board_id: uuid.UUID, ticket_id: uuid.UUID, ticket_update: TicketUpdate,
                  current_user: User = Depends(get_current_user), 
                  db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.board_id == board_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    update_data = ticket_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ticket, field, value)
    
    db.commit()
    db.refresh(ticket)
    return ticket

@router.delete("/{ticket_id}")
def delete_ticket(board_id: uuid.UUID, ticket_id: uuid.UUID,
                  current_user: User = Depends(get_current_user), 
                  db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.board_id == board_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    db.delete(ticket)
    db.commit()
    return {"success": True, "message": "Ticket deleted successfully"}
