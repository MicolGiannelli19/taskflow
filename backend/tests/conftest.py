import os
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ.setdefault("USE_MOCK_AUTH", "false")

import pytest
from uuid import uuid4
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, engine, get_db
from app.dependencies import get_current_user
from app.models import User, Board, BoardColumn, UserIdentity
from app.auth_utils import get_password_hash

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_user(db):
    user = User(id=uuid4(), email="test@example.com", name="Test User")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_board(db, test_user):
    board = Board(id=uuid4(), name="Test Board", owner_id=test_user.id)
    db.add(board)
    db.flush()
    column = BoardColumn(id=uuid4(), board_id=board.id, name="To Do", position=0)
    db.add(column)
    db.commit()
    db.refresh(board)
    db.refresh(column)
    return board, column


@pytest.fixture
def client(db, test_user):
    """Authenticated client — get_current_user returns test_user."""
    def override_get_db():
        yield db

    def override_get_current_user():
        return test_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture
def auth_client(db):
    """Unauthenticated client for auth endpoints — only overrides get_db."""
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
