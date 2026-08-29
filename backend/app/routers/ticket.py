import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db, User, BoardMember
from app.schemas import (TicketCreate, TicketUpdate, TicketDetailed, UserResponse,
                         CommentResponse)
from app.dependencies import get_current_user, require_board_role
from app.authorization import Role
from app.services import TicketService

router = APIRouter(prefix="/api/boards/{board_id}/tickets", tags=["tickets"])


@router.get("/{ticket_id}", response_model=TicketDetailed)
def get_ticket(board_id: uuid.UUID, ticket_id: uuid.UUID,
               current_user: User = Depends(get_current_user),
               _membership: BoardMember = Depends(require_board_role(Role.VIEWER)),
               db: Session = Depends(get_db)):
    detail = TicketService(db).get_ticket_detail(board_id, ticket_id, current_user)
    t = detail.ticket
    return TicketDetailed(
        id=t.id, board_id=t.board_id, column_id=t.column_id,
        title=t.title, description=t.description, position=t.position,
        priority=t.priority, assignee_id=t.assignee_id,
        assignee=UserResponse.model_validate(detail.assignee) if detail.assignee else None,
        creator_id=t.creator_id,
        creator=UserResponse.model_validate(detail.creator) if detail.creator else None,
        due_date=t.due_date, attachments=[],
        comments=[
            CommentResponse(
                id=c.comment.id, user_id=c.comment.user_id,
                user_name=c.author.name if c.author else "Unknown",
                user_avatar=c.author.avatar if c.author else None,
                content=c.comment.content, created_at=c.comment.created_at,
            )
            for c in detail.comments
        ],
        created_at=t.created_at, updated_at=t.updated_at,
    )


@router.post("")
def create_ticket(board_id: uuid.UUID, ticket: TicketCreate,
                  current_user: User = Depends(get_current_user),
                  _membership: BoardMember = Depends(require_board_role(Role.MEMBER)),
                  db: Session = Depends(get_db)):
    return TicketService(db).create_ticket(board_id, ticket, current_user)


@router.patch("/{ticket_id}")
def update_ticket(board_id: uuid.UUID, ticket_id: uuid.UUID, ticket_update: TicketUpdate,
                  current_user: User = Depends(get_current_user),
                  _membership: BoardMember = Depends(require_board_role(Role.MEMBER)),
                  db: Session = Depends(get_db)):
    return TicketService(db).update_ticket(board_id, ticket_id, ticket_update, current_user)


@router.delete("/{ticket_id}")
def delete_ticket(board_id: uuid.UUID, ticket_id: uuid.UUID,
                  current_user: User = Depends(get_current_user),
                  _membership: BoardMember = Depends(require_board_role(Role.MEMBER)),
                  db: Session = Depends(get_db)):
    TicketService(db).delete_ticket(board_id, ticket_id, current_user)
    return {"success": True, "message": "Ticket deleted successfully"}
