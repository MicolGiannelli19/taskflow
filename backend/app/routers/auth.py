from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserIdentity
from app.schemas import UserCreate, UserProfileUpdate, UserResponse
from app.auth_utils import get_password_hash, verify_password, create_access_token
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user account with email and password.

    Creates a User record and a corresponding UserIdentity for password auth.
    Profile details (name, avatar) are set separately via PATCH /me.
    """
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(email=user.email)
    db.add(new_user)
    db.flush()

    identity = UserIdentity(
        user_id=new_user.id,
        provider="password",
        provider_id=user.email,
        password_hash=get_password_hash(user.password)
    )
    db.add(identity)
    db.commit()
    db.refresh(new_user)

    return new_user

@router.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    identity = db.query(UserIdentity).filter(
        UserIdentity.user_id == user.id,
        UserIdentity.provider == "password"
    ).first() if user else None

    if not identity or not verify_password(form_data.password, identity.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.patch("/me", response_model=UserResponse)
def update_profile(
    profile: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if profile.name is not None:
        current_user.name = profile.name
    if profile.avatar is not None:
        current_user.avatar = profile.avatar
    db.commit()
    db.refresh(current_user)
    return current_user
