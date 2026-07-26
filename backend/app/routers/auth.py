from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db, User
from app.schemas import UserCreate, UserProfileUpdate, UserResponse
from app.dependencies import get_current_user
from app.services import AuthService

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    return AuthService(db).register(user)


@router.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    access_token = AuthService(db).authenticate(form_data.username, form_data.password)
    return {"access_token": access_token, "token_type": "bearer"}


@router.patch("/me", response_model=UserResponse)
def update_profile(
    profile: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AuthService(db).update_profile(current_user, profile)
