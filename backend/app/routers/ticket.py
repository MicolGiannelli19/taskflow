import uuid

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.database import get_db, User, BoardMember
from app.schemas import (TicketCreate, TicketUpdate, TicketDetailed, UserResponse,
                         CommentCreate, CommentUpdate, CommentResponse)
from app.dependencies import get_current_user, require_board_role
from app.authorization import Role
from app.services import TicketService
from app.services.ticket_service import CommentWithAuthor

router = APIRouter(prefix="/api/boards/{board_id}/tickets", tags=["tickets"])


def _to_comment_response(c: CommentWithAuthor) -> CommentResponse:
    """One place that decides how a comment looks on the wire."""
    return CommentResponse(
        id=c.comment.id,
        user_id=c.comment.user_id,
        user_name=c.author.name if c.author else "Unknown",
        user_avatar=c.author.avatar if c.author else None,
        content=c.comment.content,
        created_at=c.comment.created_at,
        updated_at=c.comment.updated_at,
    )


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
        comments=[_to_comment_response(c) for c in detail.comments],
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


@router.post("/{ticket_id}/comments", response_model=CommentResponse, status_code=201)
def create_comment(board_id: uuid.UUID, ticket_id: uuid.UUID, body: CommentCreate,
                   current_user: User = Depends(get_current_user),
                   _membership: BoardMember = Depends(require_board_role(Role.MEMBER)),
                   db: Session = Depends(get_db)):
    comment = TicketService(db).add_comment(board_id, ticket_id, body, current_user)
    return _to_comment_response(comment)


@router.patch("/{ticket_id}/comments/{comment_id}", response_model=CommentResponse)
def update_comment(board_id: uuid.UUID, ticket_id: uuid.UUID, comment_id: uuid.UUID,
                   body: CommentUpdate,
                   current_user: User = Depends(get_current_user),
                   _membership: BoardMember = Depends(require_board_role(Role.MEMBER)),
                   db: Session = Depends(get_db)):
    comment = TicketService(db).update_comment(
        board_id, ticket_id, comment_id, body, current_user
    )
    return _to_comment_response(comment)


@router.delete("/{ticket_id}/comments/{comment_id}", status_code=204)
def delete_comment(board_id: uuid.UUID, ticket_id: uuid.UUID, comment_id: uuid.UUID,
                   current_user: User = Depends(get_current_user),
                   # Bound, not discarded: deleting someone else's comment needs
                   # the caller's board role.
                   membership: BoardMember = Depends(require_board_role(Role.MEMBER)),
                   db: Session = Depends(get_db)):
    TicketService(db).delete_comment(
        board_id, ticket_id, comment_id, current_user, membership
    )
    return Response(status_code=204)
