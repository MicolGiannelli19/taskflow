import logging

from sqlalchemy.orm import Session

from app.database import User, UserIdentity
from app.schemas import UserCreate, UserProfileUpdate
from app.auth_utils import get_password_hash, verify_password, create_access_token
from app.exceptions import ConflictError, UnauthorizedError

logger = logging.getLogger(__name__)


class AuthService:
    """Business logic for registration, authentication and profile updates."""

    def __init__(self, db: Session):
        self.db = db

    def register(self, user: UserCreate) -> User:
        """Register a new user account with email and password.

        Creates a User record and a corresponding UserIdentity for password
        auth. Profile details (name, avatar) are set separately via PATCH /me.
        """
        if self.db.query(User).filter(User.email == user.email).first():
            logger.warning("Registration attempt with existing email: %s", user.email)
            raise ConflictError("Email already registered")

        new_user = User(email=user.email)
        self.db.add(new_user)
        self.db.flush()

        identity = UserIdentity(
            user_id=new_user.id,
            provider="password",
            provider_id=user.email,
            password_hash=get_password_hash(user.password),
        )
        self.db.add(identity)
        self.db.commit()
        self.db.refresh(new_user)

        logger.info("New user registered: %s (id=%s)", new_user.email, new_user.id)
        return new_user

    def authenticate(self, email: str, password: str) -> str:
        """Verify credentials and return a signed access token."""
        user = self.db.query(User).filter(User.email == email).first()
        identity = (
            self.db.query(UserIdentity)
            .filter(
                UserIdentity.user_id == user.id,
                UserIdentity.provider == "password",
            )
            .first()
            if user
            else None
        )

        if not identity or not verify_password(password, identity.password_hash):
            logger.warning("Failed login attempt for email: %s", email)
            raise UnauthorizedError("Incorrect email or password")

        logger.info("User %s logged in successfully", user.id)
        return create_access_token(data={"sub": str(user.id)})

    def update_profile(self, current_user: User, profile: UserProfileUpdate) -> User:
        """Apply partial profile updates to the authenticated user."""
        if profile.name is not None:
            current_user.name = profile.name
        if profile.avatar is not None:
            current_user.avatar = profile.avatar
        self.db.commit()
        self.db.refresh(current_user)
        logger.info("User %s updated profile", current_user.id)
        return current_user
