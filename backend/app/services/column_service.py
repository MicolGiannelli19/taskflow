import logging
import uuid
from typing import List

from sqlalchemy.orm import Session

from app.database import BoardColumn, Ticket, User
from app.schemas import ColumnCreate, ColumnUpdate
from app.exceptions import NotFoundError, ValidationError

logger = logging.getLogger(__name__)


class ColumnService:
    """Business logic for a board's columns and their ordering.

    Positions are kept dense (0..n-1) after every mutation, so the board payload
    can order by position without gaps or ties to break.
    """

    def __init__(self, db: Session):
        self.db = db

    def _ordered(self, board_id: uuid.UUID) -> List[BoardColumn]:
        return (
            self.db.query(BoardColumn)
            .filter(BoardColumn.board_id == board_id)
            .order_by(BoardColumn.position)
            .all()
        )

    def _get_column(self, board_id: uuid.UUID, column_id: uuid.UUID) -> BoardColumn:
        """Load a column scoped to its board, or raise ``NotFoundError``."""
        column = (
            self.db.query(BoardColumn)
            .filter(BoardColumn.id == column_id, BoardColumn.board_id == board_id)
            .first()
        )
        if not column:
            logger.warning("Column %s not found on board %s", column_id, board_id)
            raise NotFoundError(f"Column {column_id} not found on board {board_id}")
        return column

    @staticmethod
    def _clean_name(name: str) -> str:
        cleaned = (name or "").strip()
        if not cleaned:
            raise ValidationError("Column name cannot be empty")
        return cleaned

    @staticmethod
    def _renumber(columns: List[BoardColumn]) -> None:
        for index, column in enumerate(columns):
            column.position = index

    def create_column(self, board_id: uuid.UUID, column: ColumnCreate,
                      current_user: User) -> BoardColumn:
        name = self._clean_name(column.name)
        columns = self._ordered(board_id)

        # No position means append; an explicit one inserts and pushes the rest
        # down, clamped so an out-of-range value lands at an end instead of
        # leaving a hole.
        target = len(columns) if column.position is None else max(0, min(column.position, len(columns)))

        new_column = BoardColumn(board_id=board_id, name=name, position=target)
        self.db.add(new_column)
        columns.insert(target, new_column)
        self._renumber(columns)

        self.db.commit()
        self.db.refresh(new_column)
        logger.info("User %s added column %s ('%s') to board %s",
                    current_user.id, new_column.id, name, board_id)
        return new_column

    def update_column(self, board_id: uuid.UUID, column_id: uuid.UUID,
                      column_update: ColumnUpdate, current_user: User) -> BoardColumn:
        column = self._get_column(board_id, column_id)
        update_data = column_update.dict(exclude_unset=True)

        if "name" in update_data:
            column.name = self._clean_name(update_data["name"])

        if update_data.get("position") is not None:
            columns = self._ordered(board_id)
            columns.remove(column)
            target = max(0, min(update_data["position"], len(columns)))
            columns.insert(target, column)
            self._renumber(columns)

        self.db.commit()
        self.db.refresh(column)
        logger.info("User %s updated column %s on board %s",
                    current_user.id, column_id, board_id)
        return column

    def delete_column(self, board_id: uuid.UUID, column_id: uuid.UUID,
                      current_user: User) -> None:
        column = self._get_column(board_id, column_id)

        # The FK cascade would take the tickets with it. Deleting a column from
        # a settings screen should never silently destroy work, so refuse and
        # make the caller empty it first.
        ticket_count = self.db.query(Ticket).filter(Ticket.column_id == column_id).count()
        if ticket_count:
            raise ValidationError(
                f"Column '{column.name}' still holds {ticket_count} ticket(s). "
                "Move or delete them before deleting the column."
            )

        remaining = [c for c in self._ordered(board_id) if c.id != column_id]
        self.db.delete(column)
        self._renumber(remaining)

        self.db.commit()
        logger.info("User %s deleted column %s from board %s",
                    current_user.id, column_id, board_id)
