import logging
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from app.database import get_db
from app.database import User, BoardMember
from app.config import settings
from app.authorization import Role, role_satisfies
from app.exceptions import NotFoundError, ForbiddenError

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")
logger = logging.getLogger(__name__)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            logger.warning("JWT token missing 'sub' claim")
            raise credentials_exception
    except JWTError as e:
        logger.warning("JWT decode failed: %s", str(e))
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        logger.warning("JWT references non-existent user_id: %s", user_id)
        raise credentials_exception
    return user


def require_board_role(minimum: Role):
    """Dependency factory enforcing board membership + a minimum role.

    Every board-scoped route declares this so authorization is checked live, in
    one place, on each request (spec §5.1). Because it depends on
    ``get_current_user``, FastAPI resolves authentication first, then this, then
    the handler body. Returns the caller's ``BoardMember`` for handlers that
    need it.

    - No membership row  → 404 (a board's existence is never leaked to non-members).
    - Role too weak       → 403.
    """
    def checker(
        board_id: uuid.UUID,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> BoardMember:
        membership = (
            db.query(BoardMember)
            .filter(
                BoardMember.board_id == board_id,
                BoardMember.user_id == current_user.id,
            )
            .first()
        )
        if membership is None:
            logger.info(
                "User %s denied board %s (not a member)", current_user.id, board_id
            )
            raise NotFoundError(f"Board {board_id} not found")
        if not role_satisfies(membership.role, minimum):
            logger.info(
                "User %s role '%s' insufficient for board %s (needs %s)",
                current_user.id, membership.role, board_id, minimum.value,
            )
            raise ForbiddenError(
                f"This action requires at least '{minimum.value}' role on the board"
            )
        return membership

    return checker
