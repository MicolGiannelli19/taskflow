from sqlalchemy import Column, String, ForeignKey, TIMESTAMP, UniqueConstraint, CheckConstraint, Index, text, Uuid
from datetime import datetime
import uuid
from app.database.session import Base


class BoardMember(Base):
    __tablename__ = "board_members"
    __table_args__ = (
        # One membership per (user, board) — no contradictory dual roles.
        UniqueConstraint("board_id", "user_id"),
        # Role is a constrained set, not free text (spec Decision 3).
        CheckConstraint(
            "role IN ('owner', 'admin', 'member', 'viewer')",
            name="valid_board_role",
        ),
        # At most one owner per board (spec Decision 1). Both dialects are
        # named: the test suite runs on SQLite, and without `sqlite_where`
        # SQLAlchemy drops the WHERE clause there, turning this into "one
        # member per board" and breaking every multi-role fixture.
        Index(
            "one_owner_per_board",
            "board_id",
            unique=True,
            postgresql_where=text("role = 'owner'"),
            sqlite_where=text("role = 'owner'"),
        ),
    )
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    board_id = Column(Uuid(as_uuid=True), ForeignKey("boards.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False, default="member")
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
