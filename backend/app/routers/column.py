import uuid

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.database import get_db, User, BoardMember
from app.schemas import ColumnCreate, ColumnUpdate, ColumnResponse
from app.dependencies import get_current_user, require_board_role
from app.core.authorization import Role
from app.services import ColumnService

# Columns are read as part of GET /api/boards/{board_id}; this router only
# covers the mutations, all of which are admin-level board configuration.
router = APIRouter(prefix="/api/boards/{board_id}/columns", tags=["columns"])


@router.post("", response_model=ColumnResponse, status_code=201)
def create_column(board_id: uuid.UUID, column: ColumnCreate,
                  current_user: User = Depends(get_current_user),
                  _membership: BoardMember = Depends(require_board_role(Role.ADMIN)),
                  db: Session = Depends(get_db)):
    return ColumnService(db).create_column(board_id, column, current_user)


@router.patch("/{column_id}", response_model=ColumnResponse)
def update_column(board_id: uuid.UUID, column_id: uuid.UUID, column_update: ColumnUpdate,
                  current_user: User = Depends(get_current_user),
                  _membership: BoardMember = Depends(require_board_role(Role.ADMIN)),
                  db: Session = Depends(get_db)):
    return ColumnService(db).update_column(board_id, column_id, column_update, current_user)


@router.delete("/{column_id}", status_code=204)
def delete_column(board_id: uuid.UUID, column_id: uuid.UUID,
                  current_user: User = Depends(get_current_user),
                  _membership: BoardMember = Depends(require_board_role(Role.ADMIN)),
                  db: Session = Depends(get_db)):
    ColumnService(db).delete_column(board_id, column_id, current_user)
    return Response(status_code=204)
