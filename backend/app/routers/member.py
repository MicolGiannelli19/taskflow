import uuid
from typing import List

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.database import get_db, User, BoardMember
from app.schemas import MemberAdd, MemberRoleUpdate, MemberResponse
from app.dependencies import require_board_role
from app.authorization import Role, parse_role
from app.services import MembershipService
from app.exceptions import NotFoundError, ValidationError

router = APIRouter(prefix="/api/boards/{board_id}/members", tags=["members"])


def _to_response(membership: BoardMember, user: User) -> MemberResponse:
    return MemberResponse(
        user_id=user.id, email=user.email, name=user.name,
        avatar=user.avatar, role=membership.role,
    )


@router.get("", response_model=List[MemberResponse])
def list_members(
    board_id: uuid.UUID,
    _membership: BoardMember = Depends(require_board_role(Role.VIEWER)),
    db: Session = Depends(get_db),
):
    members = MembershipService(db).list_members(board_id)
    users = {u.id: u for u in db.query(User).filter(
        User.id.in_([m.user_id for m in members])
    ).all()}
    return [_to_response(m, users[m.user_id]) for m in members if m.user_id in users]


@router.post("", response_model=MemberResponse, status_code=201)
def add_member(
    board_id: uuid.UUID,
    body: MemberAdd,
    _membership: BoardMember = Depends(require_board_role(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    role = parse_role(body.role)
    if role == Role.OWNER:
        raise ValidationError("Cannot add a member as owner; ownership transfer is not supported")

    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise NotFoundError(f"No user with email {body.email}")

    membership = MembershipService(db).add_member(board_id, user.id, role)
    return _to_response(membership, user)


@router.patch("/{user_id}", response_model=MemberResponse)
def change_member_role(
    board_id: uuid.UUID,
    user_id: uuid.UUID,
    body: MemberRoleUpdate,
    _membership: BoardMember = Depends(require_board_role(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    role = parse_role(body.role)
    if role == Role.OWNER:
        raise ValidationError("Ownership transfer is not supported")

    membership = MembershipService(db).change_role(board_id, user_id, role)
    user = db.query(User).filter(User.id == user_id).first()
    return _to_response(membership, user)


@router.delete("/{user_id}", status_code=204)
def remove_member(
    board_id: uuid.UUID,
    user_id: uuid.UUID,
    _membership: BoardMember = Depends(require_board_role(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    MembershipService(db).remove_member(board_id, user_id)
    return Response(status_code=204)
