import logging
import uuid

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Board, BoardColumn, Ticket, User
from app.schemas import BoardCreate, BoardBase, BoardWithData, TicketBasic, ColumnResponse
from app.dependencies import get_current_user
from app.exceptions import NotFoundError, ValidationError, ForbiddenError

router = APIRouter(prefix="/api/boards", tags=["boards"])
logger = logging.getLogger(__name__)


@router.get("", response_model=List[BoardBase])
def get_boards(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    boards = db.query(Board).filter(Board.owner_id == current_user.id).all()
    logger.info("User %s fetched %d board(s)", current_user.id, len(boards))
    return boards


@router.get("/{board_id}", response_model=BoardWithData)
def get_board(
    board_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        logger.warning("Board %s not found", board_id)
        raise NotFoundError(f"Board {board_id} not found")

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

    logger.info("User %s fetched board %s", current_user.id, board_id)
    return BoardWithData(
        id=board.id,
        name=board.name,
        description=board.description,
        owner_id=board.owner_id,
        created_at=board.created_at,
        columns=columns,
        tickets=tickets
    )


@router.post("", response_model=BoardBase)
def create_board(board: BoardCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not board.name or not board.name.strip():
        raise ValidationError("Board name cannot be empty")

    new_board = Board(
        name=board.name,
        description=board.description,
        owner_id=current_user.id
    )
    db.add(new_board)
    db.commit()
    db.refresh(new_board)

    default_columns = ["Backlog", "In Progress", "Done"]
    for position, name in enumerate(default_columns):
        db.add(BoardColumn(board_id=new_board.id, name=name, position=position))
    db.commit()
    db.refresh(new_board)

    logger.info("User %s created board %s ('%s')", current_user.id, new_board.id, new_board.name)
    return new_board


@router.delete("/{board_id}", status_code=204)
def delete_board(
    board_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise NotFoundError(f"Board {board_id} not found")

    if board.owner_id != current_user.id:
        raise ForbiddenError("Only the board owner can delete this board")

    db.delete(board)
    db.commit()
    logger.info("User %s deleted board %s", current_user.id, board_id)
    return Response(status_code=204)
