"""Shared fixtures for the API test suite.

Clerk never runs here. ``get_current_user`` is a FastAPI dependency, so the app
can be handed a known ``User`` instead — the standard override pattern. Tests
stay fast and offline: no network, no JWKS fetch, no ``CLERK_SECRET_KEY``.

**Known gap (spec §4.4).** Overriding ``get_current_user`` skips the whole
token-verification path — ``authenticate_request``, the ``azp`` check, the
``sub`` extraction. That is the right trade (these tests cover *our*
authorization, not Clerk's authentication), but it means a misconfigured
``clerk_authorized_parties`` would sail past this suite untouched. The
``unauthenticated`` fixture below stubs Clerk one level lower, at the client,
so at least the rejection branch of ``get_current_user`` is real code.

The database is SQLite in memory, rebuilt per test. Models use SQLAlchemy's
dialect-agnostic ``Uuid`` type, so the same metadata that creates the Postgres
schema creates this one.
"""
import socket
import uuid
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.authorization import Role
from app.database import Base, BoardColumn, Ticket, User, UserIdentity, get_db
from app.dependencies import get_current_user
from app.main import app
from app.schemas import BoardCreate
from app.services import BoardService, MembershipService


# ─── Guard rails ─────────────────────────────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def no_network():
    """Turn an accidental network call into a loud failure.

    Spec §4.5 asks for a suite that runs with networking disabled. Rather than
    leaving that as something to remember to check, every outbound connection
    is refused for the duration of the run: if a future change makes Clerk
    reachable from a test, that test fails here instead of passing quietly on a
    developer's machine and hanging in CI.
    """
    real_connect = socket.socket.connect
    real_create_connection = socket.create_connection

    def _refuse(*args, **kwargs):
        raise RuntimeError(
            "A test tried to open a network connection. Tests must stub Clerk "
            "and use the in-memory database — see the module docstring."
        )

    socket.socket.connect = _refuse
    socket.create_connection = _refuse
    try:
        yield
    finally:
        socket.socket.connect = real_connect
        socket.create_connection = real_create_connection


# ─── Database ────────────────────────────────────────────────────────────────

@pytest.fixture
def engine():
    """A fresh in-memory database per test.

    ``StaticPool`` + ``check_same_thread=False`` keep every connection pointed
    at the same in-memory database: ``TestClient`` runs the app on its own
    thread, and without this the request would open a second, empty one.
    """
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # SQLite ignores foreign keys unless asked. Turning them on keeps ON DELETE
    # behaviour honest against what Postgres does.
    @event.listens_for(engine, "connect")
    def _enable_foreign_keys(dbapi_connection, _record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()


@pytest.fixture
def db_session(engine):
    """A session with the same settings as the app's ``SessionLocal``.

    Test and request share one session, so a row written by a handler is
    visible to the assertions that follow without re-querying.
    """
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()


# ─── Clients ─────────────────────────────────────────────────────────────────

@pytest.fixture
def unauthenticated(db_session, monkeypatch):
    """A client carrying no credentials.

    Unlike the other clients this one leaves ``get_current_user`` in place and
    stubs the Clerk *client* instead, so the dependency's own rejection path —
    ``is_signed_in`` false → ``UnauthorizedError`` → 401 — is really executed.
    """
    def _rejecting_clerk():
        return SimpleNamespace(
            authenticate_request=lambda request, options: SimpleNamespace(
                is_signed_in=False,
                reason="no-session-token",
                message="No session token in the request",
                payload=None,
            )
        )

    monkeypatch.setattr("app.dependencies.get_clerk", _rejecting_clerk)
    app.dependency_overrides[get_db] = lambda: db_session
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def as_user(db_session):
    """Authenticated client factory: ``as_user(alice).get("/api/boards")``."""
    def _as(user: User) -> TestClient:
        app.dependency_overrides[get_db] = lambda: db_session
        app.dependency_overrides[get_current_user] = lambda: user
        return TestClient(app)

    yield _as
    app.dependency_overrides.clear()


# ─── Users ───────────────────────────────────────────────────────────────────

@pytest.fixture
def make_user(db_session):
    """Create a TaskFlow user, optionally linked to a Clerk account."""
    def _make(email: str, name: str | None = None, *,
              avatar: str | None = None, clerk_id: str | None = None) -> User:
        user = User(email=email, name=name, avatar=avatar)
        db_session.add(user)
        db_session.flush()
        if clerk_id:
            db_session.add(
                UserIdentity(user_id=user.id, provider="clerk", provider_id=clerk_id)
            )
        db_session.commit()
        db_session.refresh(user)
        return user

    return _make


@pytest.fixture
def owner(make_user):
    return make_user("owner@example.com", "Olivia Owner")


@pytest.fixture
def admin(make_user):
    return make_user("admin@example.com", "Adam Admin")


@pytest.fixture
def member(make_user):
    return make_user("member@example.com", "Mia Member")


@pytest.fixture
def viewer(make_user):
    return make_user("viewer@example.com", "Victor Viewer")


@pytest.fixture
def outsider(make_user):
    """A real user with no membership on ``board`` — the 404 case."""
    return make_user("outsider@example.com", "Otto Outsider")


# ─── Board contents ──────────────────────────────────────────────────────────

@pytest.fixture
def board(db_session, owner, admin, member, viewer):
    """A board with one user at each role, built through the real services."""
    board = BoardService(db_session).create_board(
        BoardCreate(name="Demo board", description="Fixture board"), owner
    )
    memberships = MembershipService(db_session)
    memberships.add_member(board.id, admin.id, Role.ADMIN)
    memberships.add_member(board.id, member.id, Role.MEMBER)
    memberships.add_member(board.id, viewer.id, Role.VIEWER)
    return board


@pytest.fixture
def column(db_session, board):
    """The board's first default column ("Backlog")."""
    return (
        db_session.query(BoardColumn)
        .filter(BoardColumn.board_id == board.id)
        .order_by(BoardColumn.position)
        .first()
    )


@pytest.fixture
def ticket(db_session, board, column, member):
    ticket = Ticket(
        board_id=board.id,
        column_id=column.id,
        title="Fixture ticket",
        description="Written by the member",
        position=0,
        priority="medium",
        creator_id=member.id,
    )
    db_session.add(ticket)
    db_session.commit()
    db_session.refresh(ticket)
    return ticket


@pytest.fixture
def missing_board_id():
    """A board id that is well-formed but belongs to no board."""
    return uuid.uuid4()
