"""Creating a ticket: only the title is essential, the rest has defaults."""

import uuid

import pytest

from app.database import Ticket


def _create(client, board, json):
    return client.post(f"/api/boards/{board.id}/tickets", json=json)


def test_title_alone_creates_a_ticket_with_defaults(as_user, member, board, column, db_session):
    response = _create(as_user(member), board,
                       {"title": "Just a title", "column_id": str(column.id)})

    assert response.status_code == 200
    ticket = db_session.get(Ticket, uuid.UUID(response.json()["id"]))
    assert ticket.priority == "medium"
    assert ticket.assignee_id == member.id
    assert ticket.description is None
    assert ticket.due_date is None


def test_explicit_null_assignee_stays_unassigned(as_user, member, board, column, db_session):
    response = _create(as_user(member), board, {
        "title": "Nobody's yet", "column_id": str(column.id), "assignee_id": None,
    })

    assert response.status_code == 200
    assert db_session.get(Ticket, uuid.UUID(response.json()["id"])).assignee_id is None


def test_explicit_assignee_is_kept(as_user, member, admin, board, column, db_session):
    response = _create(as_user(member), board, {
        "title": "For the admin", "column_id": str(column.id), "assignee_id": str(admin.id),
    })

    assert response.status_code == 200
    assert db_session.get(Ticket, uuid.UUID(response.json()["id"])).assignee_id == admin.id


@pytest.mark.parametrize("bad", [
    {"title": ""},
    {"title": "   "},
    {"title": "Ok", "priority": ""},
    {"title": "Ok", "priority": "urgent"},
])
def test_invalid_fields_are_rejected(as_user, member, board, column, bad):
    response = _create(as_user(member), board, {"column_id": str(column.id), **bad})

    assert response.status_code == 422
