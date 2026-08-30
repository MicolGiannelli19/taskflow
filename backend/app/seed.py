"""Development seed data.

Populates the database with a demo board, users and tickets. Safe to run
repeatedly — it no-ops if the data already exists. Runs automatically on app
startup (see ``app.main``) and can also be invoked directly::

    python -m app.seed

All seed users share the password ``password123``.
"""
import logging
from datetime import datetime

from sqlalchemy.orm import Session

from app.database import (
    SessionLocal, User, UserIdentity, Board, BoardMember, BoardColumn,
    Ticket, Comment,
)
from app.auth_utils import get_password_hash

logger = logging.getLogger(__name__)

SEED_PASSWORD = "password123"


def seed(db: Session | None = None) -> None:
    """Insert development data. Idempotent: skips if already seeded."""
    own_session = db is None
    db = db or SessionLocal()
    try:
        if db.query(User).filter(User.email == "alice@example.com").first():
            logger.info("Seed data already present — skipping.")
            return

        password_hash = get_password_hash(SEED_PASSWORD)

        alice = User(email="alice@example.com", name="Alice Johnson",
                     avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=alice")
        bob = User(email="bob@example.com", name="Bob Smith",
                   avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=bob")
        carol = User(email="carol@example.com", name="Carol White",
                     avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=carol")
        db.add_all([alice, bob, carol])
        db.flush()

        db.add_all([
            UserIdentity(user_id=u.id, provider="password",
                         provider_id=u.email, password_hash=password_hash)
            for u in (alice, bob, carol)
        ])

        board = Board(name="Taskflow MVP", description="Main development board")
        db.add(board)
        db.flush()

        db.add_all([
            BoardMember(board_id=board.id, user_id=alice.id, role="owner"),
            BoardMember(board_id=board.id, user_id=bob.id, role="member"),
            BoardMember(board_id=board.id, user_id=carol.id, role="member"),
        ])

        backlog = BoardColumn(board_id=board.id, name="Backlog", position=0)
        in_progress = BoardColumn(board_id=board.id, name="In Progress", position=1)
        in_review = BoardColumn(board_id=board.id, name="In Review", position=2)
        done = BoardColumn(board_id=board.id, name="Done", position=3)
        db.add_all([backlog, in_progress, in_review, done])
        db.flush()

        tickets = [
            Ticket(board_id=board.id, column_id=backlog.id, title="Set up CI/CD pipeline",
                   description="Configure GitHub Actions for automated testing and deployment.",
                   position=0, priority="high", assignee_id=bob.id, creator_id=alice.id),
            Ticket(board_id=board.id, column_id=backlog.id, title="Write API documentation",
                   description="Document all REST endpoints using OpenAPI/Swagger.",
                   position=1, priority="medium", assignee_id=carol.id, creator_id=alice.id),
            Ticket(board_id=board.id, column_id=in_progress.id, title="Implement auth endpoints",
                   description="Build login, register, and token refresh endpoints.",
                   position=0, priority="high", assignee_id=alice.id, creator_id=alice.id),
            Ticket(board_id=board.id, column_id=in_progress.id, title="Build kanban board UI",
                   description="Drag and drop columns and tickets using the board API.",
                   position=1, priority="high", assignee_id=bob.id, creator_id=alice.id),
            Ticket(board_id=board.id, column_id=in_review.id, title="Database schema design",
                   description="Design and document the initial PostgreSQL schema.",
                   position=0, priority="medium", assignee_id=alice.id, creator_id=alice.id),
            Ticket(board_id=board.id, column_id=done.id, title="Project scaffolding",
                   description="Set up FastAPI backend and React frontend with Docker.",
                   position=0, priority="low", assignee_id=alice.id, creator_id=alice.id),
        ]
        db.add_all(tickets)
        db.flush()

        auth_ticket, ui_ticket = tickets[2], tickets[3]
        _now = datetime.utcnow()
        db.add_all([
            # created_at/updated_at pinned to one reading so seeded comments
            # don't read as "edited" (the two column defaults differ by µs).
            Comment(ticket_id=auth_ticket.id, user_id=bob.id, created_at=_now, updated_at=_now,
                    content="Should we use JWT or sessions? I prefer JWT for the stateless approach."),
            Comment(ticket_id=auth_ticket.id, user_id=alice.id, created_at=_now, updated_at=_now,
                    content="JWT with refresh tokens — already planned in the schema."),
            Comment(ticket_id=ui_ticket.id, user_id=carol.id, created_at=_now, updated_at=_now,
                    content="Are we using a drag and drop library or building it from scratch?"),
            Comment(ticket_id=ui_ticket.id, user_id=bob.id, created_at=_now, updated_at=_now,
                    content="Looking at dnd-kit, seems lightweight and well maintained."),
        ])

        db.commit()
        logger.info("Database seeded with development data.")
    finally:
        if own_session:
            db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    seed()
