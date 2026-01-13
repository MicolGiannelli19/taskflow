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
    # NOTE: is this good practice should have multiple boards with the same id?
    board = db.query(Board).filter(Board.id == board_id).first()

    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    columns = (
        db.query(BoardColumn)
        .filter(BoardColumn.board_id == board_id)
        .order_by(BoardColumn.position)
        .all()
    )

    tickets = (
        db.query(Ticket)
        .with_entities(
                Ticket.id,
                Ticket.board_id,
                Ticket.column_id,
                Ticket.title,
                Ticket.priority,
                Ticket.assignee_id,
                Ticket.due_date
        )
        .filter(Ticket.board_id == board_id)
        .all()
    )

    result = BoardWithData(
        id=board.id,
        name=board.name,
        description=board.description,
        owner_id=board.owner_id,
        created_at=board.created_at,
        columns=columns,
        tickets=tickets
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
