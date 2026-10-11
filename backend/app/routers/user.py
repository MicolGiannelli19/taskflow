from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db, User
from app.schemas import UserResponse, UserSuggestion
from app.dependencies import get_current_user
from app.services import UserService

router = APIRouter(prefix="/api/users", tags=["users"])


# Registration, login and profile editing live in Clerk — see the frontend's
# <SignUp>, <SignIn> and <UserProfile>. What remains is the one thing Clerk
# can't answer: which TaskFlow user the caller is. The frontend needs that
# `users.id` to tell whether a ticket or comment is theirs.
@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/search", response_model=List[UserSuggestion])
def search_users(
    # Two characters minimum: a one-letter query matches most of the directory
    # and tells the caller nothing they were actually looking for.
    q: str = Query(..., min_length=2, max_length=100),
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Typeahead for "add someone to this board".

    Any signed-in user can search every user, which is what makes inviting by
    name possible at all. There is no organisation or tenant boundary in the
    schema yet to scope it to; when one exists, this is the query to narrow.
    """
    return UserService(db).search(q)
