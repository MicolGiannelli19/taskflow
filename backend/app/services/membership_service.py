import logging
import uuid
from typing import List, Optional

from sqlalchemy.orm import Session

from app.database import BoardMember
from app.core.authorization import Role
from app.core.exceptions import NotFoundError, ConflictError, ValidationError

logger = logging.getLogger(__name__)


class MembershipService:
    """The single home for board-membership mutations (spec Decision 6).

    Every add/change/remove goes through here so a future cache-invalidation (or
    audit) hook has exactly one place to live, and so the "at least one owner"
    invariant is enforced in one spot.
    """

    def __init__(self, db: Session):
        self.db = db

    def get_membership(self, board_id: uuid.UUID, user_id: uuid.UUID) -> Optional[BoardMember]:
        return (
            self.db.query(BoardMember)
            .filter(BoardMember.board_id == board_id, BoardMember.user_id == user_id)
            .first()
        )

    def list_members(self, board_id: uuid.UUID) -> List[BoardMember]:
        return self.db.query(BoardMember).filter(BoardMember.board_id == board_id).all()

    def add_member(
        self,
        board_id: uuid.UUID,
        user_id: uuid.UUID,
        role: Role = Role.MEMBER,
        *,
        commit: bool = True,
    ) -> BoardMember:
        """Add a membership. ``commit=False`` lets a caller enlist this in a
        larger transaction (e.g. creating a board + its owner atomically)."""
        if self.get_membership(board_id, user_id):
            raise ConflictError("User is already a member of this board")
        member = BoardMember(board_id=board_id, user_id=user_id, role=role.value)
        self.db.add(member)
        if commit:
            self.db.commit()
            self.db.refresh(member)
        logger.info("Added user %s to board %s as %s", user_id, board_id, role.value)
        return member

    def change_role(self, board_id: uuid.UUID, user_id: uuid.UUID, role: Role) -> BoardMember:
        membership = self.get_membership(board_id, user_id)
        if not membership:
            raise NotFoundError("Membership not found")
        if membership.role == Role.OWNER.value and role != Role.OWNER:
            self._guard_last_owner(board_id)
        membership.role = role.value
        self.db.commit()
        self.db.refresh(membership)
        logger.info("Changed user %s role on board %s to %s", user_id, board_id, role.value)
        return membership

    def remove_member(self, board_id: uuid.UUID, user_id: uuid.UUID) -> None:
        membership = self.get_membership(board_id, user_id)
        if not membership:
            raise NotFoundError("Membership not found")
        if membership.role == Role.OWNER.value:
            self._guard_last_owner(board_id)
        self.db.delete(membership)
        self.db.commit()
        logger.info("Removed user %s from board %s", user_id, board_id)

    def _guard_last_owner(self, board_id: uuid.UUID) -> None:
        """Refuse to remove/demote the last owner (spec invariant 1)."""
        owner_count = (
            self.db.query(BoardMember)
            .filter(BoardMember.board_id == board_id, BoardMember.role == Role.OWNER.value)
            .count()
        )
        if owner_count <= 1:
            raise ValidationError("A board must always have at least one owner")
