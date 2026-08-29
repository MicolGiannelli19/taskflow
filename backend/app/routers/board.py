import uuid
from typing import List

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.database import get_db, User, BoardMember
from app.schemas import BoardCreate, BoardBase, BoardWithData
from app.dependencies import get_current_user, require_board_role
from app.authorization import Role
from app.services import BoardService

router = APIRouter(prefix="/api/boards", tags=["boards"])


@router.get("", response_model=List[BoardBase])
def get_boards(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return BoardService(db).list_boards(current_user)


@router.get("/{board_id}", response_model=BoardWithData)
def get_board(
    board_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    _membership: BoardMember = Depends(require_board_role(Role.VIEWER)),
    db: Session = Depends(get_db),
):
    detail = BoardService(db).get_board_with_data(board_id, current_user)
    return BoardWithData(
        id=detail.board.id,
        name=detail.board.name,
        description=detail.board.description,
        created_at=detail.board.created_at,
        columns=detail.columns,
        tickets=detail.tickets,
    )


@router.post("", response_model=BoardBase)
def create_board(board: BoardCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return BoardService(db).create_board(board, current_user)


@router.delete("/{board_id}", status_code=204)
def delete_board(
    board_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    _membership: BoardMember = Depends(require_board_role(Role.OWNER)),
    db: Session = Depends(get_db),
):
    BoardService(db).delete_board(board_id, current_user)
    return Response(status_code=204)
