from fastapi import APIRouter, Depends

from app.database import User
from app.schemas import UserResponse
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


# Registration, login and profile editing now live in Clerk — see the frontend's
# <SignUp>, <SignIn> and <UserProfile>. What remains is the one thing Clerk
# can't answer: which TaskFlow user the caller is. The frontend needs that
# `users.id` to tell whether a ticket or comment is theirs.
@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
