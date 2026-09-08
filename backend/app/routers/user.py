from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db, User
from app.schemas import UserSuggestion
from app.dependencies import get_current_user
from app.services import UserService

router = APIRouter(prefix="/api/users", tags=["users"])


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
