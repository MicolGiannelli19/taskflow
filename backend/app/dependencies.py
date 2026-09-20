import logging
import uuid

from clerk_backend_api.security.types import AuthenticateRequestOptions
from fastapi import Depends, Request
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.database import User, BoardMember
from app.clerk import get_clerk
from app.config import settings
from app.authorization import Role, role_satisfies
from app.exceptions import NotFoundError, ForbiddenError, UnauthorizedError
from app.services.identity_service import IdentityService

# Declared only so Swagger shows an "Authorize" button; the SDK reads the
# header itself. auto_error=False keeps the 401 shape ours rather than
# FastAPI's.
bearer_scheme = HTTPBearer(auto_error=False)

logger = logging.getLogger(__name__)


# Deliberately sync: `authenticate_request` does blocking I/O (it fetches and
# caches Clerk's JWKS), so FastAPI should run this in its threadpool rather
# than on the event loop — same as every handler in this app.
def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    _credentials=Depends(bearer_scheme),
) -> User:
    """Authenticate the caller against Clerk and return their TaskFlow user.

    Clerk verifies the session token's signature, expiry and `azp` claim. The
    `sub` claim is a Clerk user ID, not a TaskFlow one, so it is exchanged for
    the local `User` record that boards and tickets are keyed on.
    """
    clerk = get_clerk()
    state = clerk.authenticate_request(
        request,
        AuthenticateRequestOptions(
            authorized_parties=settings.clerk_authorized_parties,
        ),
    )

    if not state.is_signed_in:
        logger.warning("Clerk rejected request: %s", state.reason or state.message)
        raise UnauthorizedError("Could not validate credentials")

    clerk_user_id = (state.payload or {}).get("sub")
    if not clerk_user_id:
        logger.warning("Clerk session token missing 'sub' claim")
        raise UnauthorizedError("Could not validate credentials")

    return IdentityService(db, clerk).resolve(clerk_user_id)


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
