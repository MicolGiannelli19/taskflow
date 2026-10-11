import logging
import uuid
from dataclasses import dataclass
from typing import List

from sqlalchemy.orm import Session

from app.database import Board, BoardColumn, BoardMember, Ticket, User
from app.schemas import BoardCreate, BoardUpdate
from app.core.authorization import Role
from app.services.membership_service import MembershipService
from app.core.exceptions import NotFoundError, ValidationError

logger = logging.getLogger(__name__)

DEFAULT_COLUMNS = ["Backlog", "In Progress", "Done"]


@dataclass
class BoardDetail:
    """A board together with its ordered columns and lightweight tickets."""
    board: Board
    columns: List[BoardColumn]
    tickets: list


class BoardService:
    """Business logic for boards and their default columns."""

    def __init__(self, db: Session):
        self.db = db

    def list_boards(self, current_user: User) -> List[Board]:
        # Boards the user is a member of (owned or invited) — membership is the
        # single source of truth for access (spec Decision 1).
        boards = (
            self.db.query(Board)
            .join(BoardMember, BoardMember.board_id == Board.id)
            .filter(BoardMember.user_id == current_user.id)
            .all()
        )
        logger.info("User %s fetched %d board(s)", current_user.id, len(boards))
        return boards

    def get_board_with_data(self, board_id: uuid.UUID, current_user: User) -> BoardDetail:
        board = self.db.query(Board).filter(Board.id == board_id).first()
        if not board:
            logger.warning("Board %s not found", board_id)
            raise NotFoundError(f"Board {board_id} not found")

        columns = (
            self.db.query(BoardColumn)
            .filter(BoardColumn.board_id == board_id)
            .order_by(BoardColumn.position)
            .all()
        )

        tickets = (
            self.db.query(Ticket)
            .with_entities(
                Ticket.id,
                Ticket.board_id,
                Ticket.column_id,
                Ticket.title,
                Ticket.priority,
                Ticket.assignee_id,
                Ticket.due_date,
            )
            .filter(Ticket.board_id == board_id)
            .all()
        )

        logger.info("User %s fetched board %s", current_user.id, board_id)
        return BoardDetail(board=board, columns=columns, tickets=tickets)

    def create_board(self, board: BoardCreate, owner: User) -> Board:
        if not board.name or not board.name.strip():
            raise ValidationError("Board name cannot be empty")

        new_board = Board(name=board.name, description=board.description)
        self.db.add(new_board)
        self.db.flush()  # assign new_board.id without ending the transaction

        # The creator becomes the board's owner. Inserted in the same
        # transaction so a board is never left without an owner (spec Decision 1).
        MembershipService(self.db).add_member(
            new_board.id, owner.id, Role.OWNER, commit=False
        )

        for position, name in enumerate(DEFAULT_COLUMNS):
            self.db.add(BoardColumn(board_id=new_board.id, name=name, position=position))

        self.db.commit()
        self.db.refresh(new_board)

        logger.info("User %s created board %s ('%s')", owner.id, new_board.id, new_board.name)
        return new_board

    def update_board(self, board_id: uuid.UUID, board_update: BoardUpdate,
                     current_user: User) -> Board:
        board = self.db.query(Board).filter(Board.id == board_id).first()
        if not board:
            logger.warning("Board %s not found (update attempt)", board_id)
            raise NotFoundError(f"Board {board_id} not found")

        update_data = board_update.dict(exclude_unset=True)

        if "name" in update_data:
            name = (update_data["name"] or "").strip()
            if not name:
                raise ValidationError("Board name cannot be empty")
            update_data["name"] = name

        for field, value in update_data.items():
            setattr(board, field, value)

        self.db.commit()
        self.db.refresh(board)
        logger.info("User %s updated board %s", current_user.id, board_id)
        return board

    def delete_board(self, board_id: uuid.UUID, current_user: User) -> None:
        # Authorization (owner-only) is enforced by require_board_role(OWNER) at
        # the route; reaching here means the caller is the owner.
        board = self.db.query(Board).filter(Board.id == board_id).first()
        if not board:
            raise NotFoundError(f"Board {board_id} not found")

        self.db.delete(board)
        self.db.commit()
        logger.info("User %s deleted board %s", current_user.id, board_id)
