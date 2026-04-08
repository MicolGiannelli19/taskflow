import logging
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Ticket, User, Comment, Board, BoardColumn
from app.schemas import (TicketCreate, TicketUpdate, TicketDetailed, UserResponse,
                         AttachmentResponse, CommentResponse)
from app.dependencies import get_current_user
from app.exceptions import NotFoundError

router = APIRouter(prefix="/api/boards/{board_id}/tickets", tags=["tickets"])
logger = logging.getLogger(__name__)


@router.get("/{ticket_id}", response_model=TicketDetailed)
def get_ticket(board_id: uuid.UUID, ticket_id: uuid.UUID,
               current_user: User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.board_id == board_id).first()
    if not ticket:
        logger.warning("Ticket %s not found on board %s", ticket_id, board_id)
        raise NotFoundError(f"Ticket {ticket_id} not found on board {board_id}")

    assignee = db.query(User).filter(User.id == ticket.assignee_id).first() if ticket.assignee_id else None
    creator = db.query(User).filter(User.id == ticket.creator_id).first()

    comments = db.query(Comment).filter(Comment.ticket_id == ticket_id).order_by(Comment.created_at).all()
    comment_responses = []
    for c in comments:
        user = db.query(User).filter(User.id == c.user_id).first()
        comment_responses.append(CommentResponse(
            id=c.id, user_id=c.user_id, user_name=user.name if user else "Unknown",
            user_avatar=user.avatar if user else None, content=c.content, created_at=c.created_at
        ))

    logger.info("User %s fetched ticket %s", current_user.id, ticket_id)
    return TicketDetailed(
        id=ticket.id, board_id=ticket.board_id, column_id=ticket.column_id,
        title=ticket.title, description=ticket.description, position=ticket.position,
        priority=ticket.priority, assignee_id=ticket.assignee_id,
        assignee=UserResponse.from_orm(assignee) if assignee else None,
        creator_id=ticket.creator_id, creator=UserResponse.from_orm(creator) if creator else None,
        due_date=ticket.due_date, attachments=[], comments=comment_responses,
        created_at=ticket.created_at, updated_at=ticket.updated_at
    )


@router.post("")
def create_ticket(board_id: uuid.UUID, ticket: TicketCreate,
                  current_user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        logger.warning("Board %s not found (ticket creation attempt by user %s)", board_id, current_user.id)
        raise NotFoundError(f"Board {board_id} not found")

    column = db.query(BoardColumn).filter(BoardColumn.id == ticket.column_id, BoardColumn.board_id == board_id).first()
    if not column:
        logger.warning("Column %s not found on board %s", ticket.column_id, board_id)
        raise NotFoundError(f"Column {ticket.column_id} not found on board {board_id}")

    max_position = db.query(Ticket).filter(Ticket.column_id == ticket.column_id).count()

    new_ticket = Ticket(
        board_id=board_id,
        column_id=ticket.column_id,
        title=ticket.title,
        description=ticket.description,
        position=max_position,
        priority=ticket.priority,
        assignee_id=ticket.assignee_id,
        creator_id=current_user.id,
        due_date=ticket.due_date
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    logger.info("User %s created ticket %s on board %s", current_user.id, new_ticket.id, board_id)
    return new_ticket


@router.patch("/{ticket_id}")
def update_ticket(board_id: uuid.UUID, ticket_id: uuid.UUID, ticket_update: TicketUpdate,
                  current_user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.board_id == board_id).first()
    if not ticket:
        logger.warning("Ticket %s not found on board %s (update attempt)", ticket_id, board_id)
        raise NotFoundError(f"Ticket {ticket_id} not found on board {board_id}")

    update_data = ticket_update.dict(exclude_unset=True)

    if "column_id" in update_data:
        column = db.query(BoardColumn).filter(BoardColumn.id == update_data["column_id"], BoardColumn.board_id == board_id).first()
        if not column:
            logger.warning("Column %s not found on board %s", update_data["column_id"], board_id)
            raise NotFoundError(f"Column {update_data['column_id']} not found on board {board_id}")

    for field, value in update_data.items():
        setattr(ticket, field, value)

    db.commit()
    db.refresh(ticket)
    logger.info("User %s updated ticket %s", current_user.id, ticket_id)
    return ticket


@router.delete("/{ticket_id}")
def delete_ticket(board_id: uuid.UUID, ticket_id: uuid.UUID,
                  current_user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.board_id == board_id).first()
    if not ticket:
        logger.warning("Ticket %s not found on board %s (delete attempt)", ticket_id, board_id)
        raise NotFoundError(f"Ticket {ticket_id} not found on board {board_id}")

    db.delete(ticket)
    db.commit()
    logger.info("User %s deleted ticket %s", current_user.id, ticket_id)
    return {"success": True, "message": "Ticket deleted successfully"}
