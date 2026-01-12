from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid
from app.database import get_db
from app.models import Board, BoardColumn, Ticket, User
from app.schemas import BoardCreate, BoardBase, BoardWithData, TicketBasic, ColumnResponse
from app.dependencies import get_current_user
import logging

router = APIRouter(prefix="/api/boards", tags=["boards"])
logger = logging.getLogger(__name__)

@router.get("", response_model=List[BoardBase])
def get_boards(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    boards = db.query(Board).filter(Board.owner_id == current_user.id).all()
    return boards

@router.get("/{board_id}", response_model=BoardWithData)
def get_board(
    board_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    board = db.query(Board).filter(Board.id == board_id).first()

    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    columns = (
        db.query(BoardColumn)
        .filter(BoardColumn.board_id == board_id)
        .order_by(BoardColumn.position)
        .all()
    )

    result = BoardWithData(
        id=board.id,
        name=board.name,
        description=board.description,
        owner_id=board.owner_id,
        created_at=board.created_at,
        columns=[],   # optional
        tickets=[]    # ✅ flattened tickets
    )

    for col in columns:
        # keep columns if you still need them
        result.columns.append(
            ColumnResponse(
                id=col.id,
                name=col.name,
                position=col.position
            )
        )

        tickets = (
            db.query(Ticket)
            .filter(Ticket.column_id == col.id)
            .order_by(Ticket.position)
            .all()
        )

        for ticket in tickets:
            assignee = None
            if ticket.assignee_id:
                assignee = (
                    db.query(User)
                    .filter(User.id == ticket.assignee_id)
                    .first()
                )

            result.tickets.append(
                TicketBasic(
                    id=ticket.id,
                    column_id=ticket.column_id,
                    title=ticket.title,
                    position=ticket.position,
                    priority=ticket.priority,
                    assignee_id=ticket.assignee_id,
                    assignee_name=assignee.name if assignee else None,
                    assignee_avatar=assignee.avatar if assignee else None,
                    due_date=ticket.due_date,
                    created_at=ticket.created_at
                )
            )

    return result


@router.post("", response_model=BoardBase)
def create_board(board: BoardCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_board = Board(
        name=board.name,
        description=board.description,
        owner_id=current_user.id
    )
    db.add(new_board)
    db.commit()
    db.refresh(new_board)
    return new_board
