"""The `require_board_role` matrix.

Three rules are asserted here, because all three are easy to break silently:

1. **A non-member gets 404, never 403.** 403 would confirm the board exists.
   That leak is the reason the dependency raises `NotFoundError` on a missing
   membership rather than `ForbiddenError`.
2. **A role too weak gets 403.** The caller is a member; there is nothing to
   hide, so say what happened.
3. **The hierarchy holds** — owner ⊃ admin ⊃ member ⊃ viewer — and an
   unrecognised stored role fails closed.

Authentication is stubbed (see `conftest.py`); what runs for real is every
authorization decision in `app/dependencies.py` and `app/core/authorization.py`.
"""
import uuid

import pytest

from app.core.authorization import Role, role_satisfies


# ─── Rule 1: a non-member is told nothing ────────────────────────────────────

@pytest.mark.parametrize(
    "method,path_suffix,payload",
    [
        ("get", "", None),
        ("patch", "", {"name": "Renamed by an outsider"}),
        ("delete", "", None),
        ("get", "/members", None),
        ("post", "/members", {"email": "viewer@example.com", "role": "member"}),
        ("get", "/tickets/{ticket_id}", None),
        ("post", "/tickets", {"title": "Sneaky", "column_id": "{column_id}"}),
        ("post", "/columns", {"name": "Sneaky column"}),
    ],
)
def test_non_member_gets_404_not_403(
    as_user, outsider, board, column, ticket, method, path_suffix, payload
):
    """Every board-scoped route hides the board's existence from outsiders."""
    suffix = path_suffix.format(ticket_id=ticket.id, column_id=column.id)
    if payload:
        payload = {
            k: v.format(column_id=column.id) if isinstance(v, str) else v
            for k, v in payload.items()
        }

    response = getattr(as_user(outsider), method)(
        f"/api/boards/{board.id}{suffix}", **({"json": payload} if payload else {})
    )

    assert response.status_code == 404, (
        f"{method.upper()} {suffix or '/'} leaked the board to a non-member "
        f"with {response.status_code}"
    )
    # The message must not distinguish "no such board" from "not yours".
    assert "not found" in response.json()["detail"].lower()


def test_board_list_only_shows_boards_you_belong_to(as_user, board, outsider, owner):
    assert as_user(outsider).get("/api/boards").json() == []

    owner_boards = as_user(owner).get("/api/boards").json()
    assert [b["id"] for b in owner_boards] == [str(board.id)]


def test_a_board_that_does_not_exist_is_also_404(as_user, owner, missing_board_id):
    """Same answer as "not yours" — which is the point."""
    response = as_user(owner).get(f"/api/boards/{missing_board_id}")

    assert response.status_code == 404


# ─── Rule 2: a member without the role gets 403 ──────────────────────────────

def test_viewer_cannot_create_a_ticket(as_user, viewer, board, column):
    response = as_user(viewer).post(
        f"/api/boards/{board.id}/tickets",
        json={"title": "Viewers may not write", "column_id": str(column.id)},
    )

    assert response.status_code == 403
    assert response.json()["error"] == "Forbidden"
    assert "member" in response.json()["detail"]


def test_viewer_cannot_edit_or_delete_a_ticket(as_user, viewer, board, ticket):
    base = f"/api/boards/{board.id}/tickets/{ticket.id}"

    assert as_user(viewer).patch(base, json={"title": "nope"}).status_code == 403
    assert as_user(viewer).delete(base).status_code == 403


def test_viewer_cannot_comment(as_user, viewer, board, ticket):
    response = as_user(viewer).post(
        f"/api/boards/{board.id}/tickets/{ticket.id}/comments",
        json={"content": "Viewers may not comment"},
    )

    assert response.status_code == 403


def test_viewer_can_read(as_user, viewer, board, ticket):
    """The other half of the rule: viewers really can see everything."""
    assert as_user(viewer).get(f"/api/boards/{board.id}").status_code == 200
    assert as_user(viewer).get(f"/api/boards/{board.id}/members").status_code == 200
    assert as_user(viewer).get(
        f"/api/boards/{board.id}/tickets/{ticket.id}"
    ).status_code == 200


def test_member_cannot_do_admin_work(as_user, member, board, viewer):
    board_url = f"/api/boards/{board.id}"

    assert as_user(member).patch(board_url, json={"name": "Renamed"}).status_code == 403
    assert as_user(member).post(
        f"{board_url}/columns", json={"name": "New column"}
    ).status_code == 403
    assert as_user(member).delete(
        f"{board_url}/members/{viewer.id}"
    ).status_code == 403


def test_admin_cannot_delete_the_board(as_user, admin, board):
    """Deletion is the one thing reserved to the owner."""
    response = as_user(admin).delete(f"/api/boards/{board.id}")

    assert response.status_code == 403
    assert "owner" in response.json()["detail"]


def test_admin_can_do_admin_work(as_user, admin, board):
    board_url = f"/api/boards/{board.id}"

    assert as_user(admin).patch(board_url, json={"name": "Renamed"}).status_code == 200
    assert as_user(admin).post(
        f"{board_url}/columns", json={"name": "New column"}
    ).status_code == 201


def test_owner_can_delete_the_board(as_user, owner, board):
    assert as_user(owner).delete(f"/api/boards/{board.id}").status_code == 204


# ─── Rule 3: the hierarchy itself ────────────────────────────────────────────

@pytest.mark.parametrize(
    "stored,minimum,expected",
    [
        ("owner", Role.OWNER, True),
        ("owner", Role.ADMIN, True),
        ("owner", Role.VIEWER, True),
        ("admin", Role.OWNER, False),
        ("admin", Role.ADMIN, True),
        ("admin", Role.MEMBER, True),
        ("member", Role.ADMIN, False),
        ("member", Role.MEMBER, True),
        ("member", Role.VIEWER, True),
        ("viewer", Role.MEMBER, False),
        ("viewer", Role.VIEWER, True),
    ],
)
def test_role_hierarchy(stored, minimum, expected):
    assert role_satisfies(stored, minimum) is expected


@pytest.mark.parametrize("stored", ["", "superuser", "OWNER", None])
def test_unknown_roles_fail_closed(stored):
    """A role the code does not recognise grants nothing, not everything."""
    assert role_satisfies(stored, Role.VIEWER) is False


def test_the_database_refuses_an_unknown_role(db_session, board, member):
    """The `role_satisfies` fail-closed branch is the *second* line of defence.

    The first is `valid_board_role`, the CHECK constraint on `board_members`:
    a role outside the four cannot be stored in the first place. Both are
    asserted — the constraint here, the fallback in the parametrised test above
    — because either one alone could be removed without the other complaining.
    """
    from sqlalchemy.exc import IntegrityError

    from app.database import BoardMember

    membership = (
        db_session.query(BoardMember)
        .filter(BoardMember.board_id == board.id, BoardMember.user_id == member.id)
        .first()
    )
    membership.role = "not-a-role"

    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


# ─── Ownership of your own words ─────────────────────────────────────────────

def test_comments_can_only_be_edited_by_their_author(
    as_user, board, ticket, member, admin
):
    posted = as_user(member).post(
        f"/api/boards/{board.id}/tickets/{ticket.id}/comments",
        json={"content": "Mine"},
    )
    comment_id = posted.json()["id"]
    url = f"/api/boards/{board.id}/tickets/{ticket.id}/comments/{comment_id}"

    # Not even an admin may put words in someone else's mouth.
    assert as_user(admin).patch(url, json={"content": "Edited"}).status_code == 403
    assert as_user(member).patch(url, json={"content": "Edited"}).status_code == 200


def test_admins_may_delete_anyones_comment_but_members_may_not(
    as_user, board, ticket, member, admin, viewer, db_session
):
    from app.core.authorization import Role as R
    from app.services import MembershipService

    # A second plain member, to prove "delete" is not "any member's business".
    MembershipService(db_session).change_role(board.id, viewer.id, R.MEMBER)
    other_member = viewer

    posted = as_user(member).post(
        f"/api/boards/{board.id}/tickets/{ticket.id}/comments",
        json={"content": "Mine"},
    )
    url = f"/api/boards/{board.id}/tickets/{ticket.id}/comments/{posted.json()['id']}"

    assert as_user(other_member).delete(url).status_code == 403
    assert as_user(admin).delete(url).status_code == 204


# ─── Cross-board leakage ─────────────────────────────────────────────────────

def test_a_ticket_id_from_another_board_is_404(
    as_user, db_session, board, ticket, outsider
):
    """Membership on *a* board is not membership on *this* one."""
    from app.schemas import BoardCreate
    from app.services import BoardService

    other_board = BoardService(db_session).create_board(
        BoardCreate(name="Outsider's own board"), outsider
    )

    # The outsider owns `other_board`, so authorization passes — the ticket
    # lookup is scoped to the board and must still refuse.
    response = as_user(outsider).get(
        f"/api/boards/{other_board.id}/tickets/{ticket.id}"
    )

    assert response.status_code == 404


def test_membership_routes_reject_a_stranger_id(as_user, admin, board):
    """Admin on this board, but the target user is not a member of it."""
    response = as_user(admin).delete(f"/api/boards/{board.id}/members/{uuid.uuid4()}")

    assert response.status_code == 404
