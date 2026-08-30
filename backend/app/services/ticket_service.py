import logging
import uuid
from datetime import datetime
from dataclasses import dataclass, field
from typing import List, Optional

from sqlalchemy.orm import Session

from app.database import Ticket, User, Comment, Board, BoardColumn, BoardMember
from app.schemas import TicketCreate, TicketUpdate, CommentCreate, CommentUpdate
from app.authorization import Role, role_satisfies
from app.exceptions import NotFoundError, ForbiddenError

logger = logging.getLogger(__name__)


@dataclass
class CommentWithAuthor:
    """A comment paired with its author (``None`` if the user is missing)."""
    comment: Comment
    author: Optional[User]


@dataclass
class TicketDetail:
    """A ticket with its assignee, creator and authored comments resolved."""
    ticket: Ticket
    assignee: Optional[User]
    creator: Optional[User]
    comments: List[CommentWithAuthor] = field(default_factory=list)


class TicketService:
    """Business logic for tickets and their comments."""

    def __init__(self, db: Session):
        self.db = db

    def _get_ticket(self, board_id: uuid.UUID, ticket_id: uuid.UUID) -> Ticket:
        """Load a ticket scoped to its board, or raise ``NotFoundError``."""
        ticket = self.db.query(Ticket).filter(
            Ticket.id == ticket_id, Ticket.board_id == board_id
        ).first()
        if not ticket:
            logger.warning("Ticket %s not found on board %s", ticket_id, board_id)
            raise NotFoundError(f"Ticket {ticket_id} not found on board {board_id}")
        return ticket

    def get_ticket_detail(self, board_id: uuid.UUID, ticket_id: uuid.UUID,
                          current_user: User) -> TicketDetail:
        ticket = self._get_ticket(board_id, ticket_id)

        assignee = (
            self.db.query(User).filter(User.id == ticket.assignee_id).first()
            if ticket.assignee_id else None
        )
        creator = self.db.query(User).filter(User.id == ticket.creator_id).first()

        comments = (
            self.db.query(Comment)
            .filter(Comment.ticket_id == ticket_id)
            .order_by(Comment.created_at)
            .all()
        )
        comments_with_authors = [
            CommentWithAuthor(
                comment=c,
                author=self.db.query(User).filter(User.id == c.user_id).first(),
            )
            for c in comments
        ]

        logger.info("User %s fetched ticket %s", current_user.id, ticket_id)
        return TicketDetail(
            ticket=ticket,
            assignee=assignee,
            creator=creator,
            comments=comments_with_authors,
        )

    def create_ticket(self, board_id: uuid.UUID, ticket: TicketCreate,
                      creator: User) -> Ticket:
        board = self.db.query(Board).filter(Board.id == board_id).first()
        if not board:
            logger.warning("Board %s not found (ticket creation attempt by user %s)", board_id, creator.id)
            raise NotFoundError(f"Board {board_id} not found")

        column = self.db.query(BoardColumn).filter(
            BoardColumn.id == ticket.column_id, BoardColumn.board_id == board_id
        ).first()
        if not column:
            logger.warning("Column %s not found on board %s", ticket.column_id, board_id)
            raise NotFoundError(f"Column {ticket.column_id} not found on board {board_id}")

        max_position = self.db.query(Ticket).filter(Ticket.column_id == ticket.column_id).count()

        new_ticket = Ticket(
            board_id=board_id,
            column_id=ticket.column_id,
            title=ticket.title,
            description=ticket.description,
            position=max_position,
            priority=ticket.priority,
            assignee_id=ticket.assignee_id,
            creator_id=creator.id,
            due_date=ticket.due_date
        )
        self.db.add(new_ticket)
        self.db.commit()
        self.db.refresh(new_ticket)
        logger.info("User %s created ticket %s on board %s", creator.id, new_ticket.id, board_id)
        return new_ticket

    def update_ticket(self, board_id: uuid.UUID, ticket_id: uuid.UUID,
                      ticket_update: TicketUpdate, current_user: User) -> Ticket:
        ticket = self.db.query(Ticket).filter(
            Ticket.id == ticket_id, Ticket.board_id == board_id
        ).first()
        if not ticket:
            logger.warning("Ticket %s not found on board %s (update attempt)", ticket_id, board_id)
            raise NotFoundError(f"Ticket {ticket_id} not found on board {board_id}")

        update_data = ticket_update.dict(exclude_unset=True)

        if "column_id" in update_data:
            column = self.db.query(BoardColumn).filter(
                BoardColumn.id == update_data["column_id"], BoardColumn.board_id == board_id
            ).first()
            if not column:
                logger.warning("Column %s not found on board %s", update_data["column_id"], board_id)
                raise NotFoundError(f"Column {update_data['column_id']} not found on board {board_id}")

        for field, value in update_data.items():
            setattr(ticket, field, value)

        self.db.commit()
        self.db.refresh(ticket)
        logger.info("User %s updated ticket %s", current_user.id, ticket_id)
        return ticket

    def delete_ticket(self, board_id: uuid.UUID, ticket_id: uuid.UUID,
                      current_user: User) -> None:
        ticket = self.db.query(Ticket).filter(
            Ticket.id == ticket_id, Ticket.board_id == board_id
        ).first()
        if not ticket:
            logger.warning("Ticket %s not found on board %s (delete attempt)", ticket_id, board_id)
            raise NotFoundError(f"Ticket {ticket_id} not found on board {board_id}")

        self.db.delete(ticket)
        self.db.commit()
        logger.info("User %s deleted ticket %s", current_user.id, ticket_id)

    # ─── Comments ────────────────────────────────────────────────────────────

    def _get_comment(self, board_id: uuid.UUID, ticket_id: uuid.UUID,
                     comment_id: uuid.UUID) -> Comment:
        """Load a comment, checking it really belongs to this board's ticket."""
        self._get_ticket(board_id, ticket_id)
        comment = self.db.query(Comment).filter(
            Comment.id == comment_id, Comment.ticket_id == ticket_id
        ).first()
        if not comment:
            logger.warning("Comment %s not found on ticket %s", comment_id, ticket_id)
            raise NotFoundError(f"Comment {comment_id} not found on ticket {ticket_id}")
        return comment

    def add_comment(self, board_id: uuid.UUID, ticket_id: uuid.UUID,
                    data: CommentCreate, author: User) -> CommentWithAuthor:
        self._get_ticket(board_id, ticket_id)

        # Both columns default to `utcnow` independently, which lands them a
        # microsecond apart — enough for the UI's `updated_at > created_at`
        # check to call a brand-new comment "edited". Stamp them from one read.
        now = datetime.utcnow()
        comment = Comment(
            ticket_id=ticket_id,
            user_id=author.id,
            content=data.content,
            created_at=now,
            updated_at=now,
        )
        self.db.add(comment)
        self.db.commit()
        self.db.refresh(comment)
        logger.info("User %s commented on ticket %s", author.id, ticket_id)
        return CommentWithAuthor(comment=comment, author=author)

    def update_comment(self, board_id: uuid.UUID, ticket_id: uuid.UUID,
                       comment_id: uuid.UUID, data: CommentUpdate,
                       current_user: User) -> CommentWithAuthor:
        comment = self._get_comment(board_id, ticket_id, comment_id)

        # Editing is the author's alone — not even an owner may put words in
        # someone else's mouth. (Deleting is a different matter, below.)
        if comment.user_id != current_user.id:
            logger.info(
                "User %s denied edit of comment %s (author is %s)",
                current_user.id, comment_id, comment.user_id,
            )
            raise ForbiddenError("You can only edit your own comments")

        comment.content = data.content
        self.db.commit()
        self.db.refresh(comment)
        logger.info("User %s edited comment %s", current_user.id, comment_id)
        return CommentWithAuthor(comment=comment, author=current_user)

    def delete_comment(self, board_id: uuid.UUID, ticket_id: uuid.UUID,
                       comment_id: uuid.UUID, current_user: User,
                       membership: BoardMember) -> None:
        comment = self._get_comment(board_id, ticket_id, comment_id)

        # Your own comment, or anyone's if you moderate the board.
        is_author = comment.user_id == current_user.id
        is_moderator = role_satisfies(membership.role, Role.ADMIN)
        if not (is_author or is_moderator):
            logger.info(
                "User %s (role '%s') denied delete of comment %s (author is %s)",
                current_user.id, membership.role, comment_id, comment.user_id,
            )
            raise ForbiddenError(
                "You can only delete your own comments unless you administer this board"
            )

        self.db.delete(comment)
        self.db.commit()
        logger.info("User %s deleted comment %s", current_user.id, comment_id)
