"""Ticket request bodies: what Pydantic lets through before any handler runs.

A schema is the API's first line of input validation. Anything it accepts
reaches the service and, from there, the database — so a gap here shows up
later as a 500 or as a bad row, never as the 422 the caller deserves.

These tests build the models directly (``TicketCreate(**body)``), which is
exactly what FastAPI does with a request body, minus the HTTP.
"""
import uuid

import pytest
from pydantic import ValidationError

from app.schemas import TicketCreate, TicketUpdate

COLUMN_ID = uuid.uuid4()


# ─── TicketCreate ────────────────────────────────────────────────────────────

def test_create_needs_only_a_column_and_a_title():
    ticket = TicketCreate(column_id=COLUMN_ID, title="Write tests")

    assert ticket.priority == "medium"
    assert ticket.description is None
    assert ticket.due_date is None


def test_create_trims_the_title():
    assert TicketCreate(column_id=COLUMN_ID, title="  Padded  ").title == "Padded"


@pytest.mark.parametrize("title", ["", "   ", "\n\t"])
def test_create_rejects_a_blank_title(title):
    with pytest.raises(ValidationError):
        TicketCreate(column_id=COLUMN_ID, title=title)


@pytest.mark.parametrize("priority", ["low", "medium", "high"])
def test_create_accepts_the_three_priorities(priority):
    assert TicketCreate(column_id=COLUMN_ID, title="t", priority=priority).priority == priority


@pytest.mark.parametrize("priority", ["", "urgent", "HIGH", None])
def test_create_rejects_any_other_priority(priority):
    with pytest.raises(ValidationError):
        TicketCreate(column_id=COLUMN_ID, title="t", priority=priority)


def test_create_tells_an_omitted_assignee_from_a_null_one():
    """Both read back as ``None``; only ``model_fields_set`` tells them apart.

    The service relies on that difference — omitted means "assign the creator",
    null means "leave unassigned" — so the schema must preserve it.
    """
    omitted = TicketCreate(column_id=COLUMN_ID, title="t")
    explicit_null = TicketCreate(column_id=COLUMN_ID, title="t", assignee_id=None)

    assert omitted.assignee_id is None and explicit_null.assignee_id is None
    assert "assignee_id" not in omitted.model_fields_set
    assert "assignee_id" in explicit_null.model_fields_set


def test_create_rejects_a_malformed_column_id():
    with pytest.raises(ValidationError):
        TicketCreate(column_id="not-a-uuid", title="t")


# ─── TicketUpdate ────────────────────────────────────────────────────────────
# A PATCH body: every field is optional, and only the fields actually sent are
# applied (`exclude_unset=True` in the service). The rules for a field that *is*
# sent should match TicketCreate's — otherwise PATCH is a way around them.

def test_an_empty_update_changes_nothing():
    assert TicketUpdate().model_dump(exclude_unset=True) == {}


def test_an_update_carries_only_the_fields_sent():
    update = TicketUpdate(priority="high", assignee_id=None)

    assert update.model_dump(exclude_unset=True) == {"priority": "high", "assignee_id": None}


def test_update_trims_the_title():
    assert TicketUpdate(title="  Renamed  ").title == "Renamed"


@pytest.mark.parametrize("title", ["", "   "])
def test_update_rejects_a_blank_title(title):
    with pytest.raises(ValidationError):
        TicketUpdate(title=title)


@pytest.mark.parametrize("priority", ["", "urgent", "HIGH"])
def test_update_rejects_an_unknown_priority(priority):
    with pytest.raises(ValidationError):
        TicketUpdate(priority=priority)


@pytest.mark.parametrize("field", ["title", "priority", "column_id", "position"])
def test_update_rejects_null_for_a_field_a_ticket_cannot_be_without(field):
    """``{"title": null}`` is not "leave it alone" — that is omitting the key.

    Sent explicitly, null would be written to the row: a NOT NULL column turns
    that into a 500, and a null priority breaks every later read of the ticket.
    """
    with pytest.raises(ValidationError):
        TicketUpdate(**{field: None})


@pytest.mark.parametrize("field", ["description", "assignee_id", "due_date"])
def test_update_allows_null_to_clear_an_optional_field(field):
    # The ticket editor sends null to clear these; that must keep working.
    assert TicketUpdate(**{field: None}).model_dump(exclude_unset=True) == {field: None}
