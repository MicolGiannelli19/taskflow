from app.models import UserIdentity
from app.auth_utils import get_password_hash
from uuid import uuid4


def test_register_success(auth_client):
    response = auth_client.post("/api/auth/register", json={
        "email": "newuser@example.com",
        "name": "New User",
        "password": "securepass123"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["name"] == "New User"
    assert "id" in data
    assert "password" not in data


def test_register_duplicate_email(auth_client):
    payload = {"email": "dup@example.com", "name": "User", "password": "pass123"}
    auth_client.post("/api/auth/register", json=payload)
    response = auth_client.post("/api/auth/register", json=payload)
    assert response.status_code == 400


def test_login_success(auth_client, db):
    # Register first, then log in
    auth_client.post("/api/auth/register", json={
        "email": "login@example.com",
        "name": "Login User",
        "password": "mypassword"
    })
    response = auth_client.post("/api/auth/token", data={
        "username": "login@example.com",
        "password": "mypassword"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(auth_client):
    auth_client.post("/api/auth/register", json={
        "email": "wrongpass@example.com",
        "name": "User",
        "password": "correctpassword"
    })
    response = auth_client.post("/api/auth/token", data={
        "username": "wrongpass@example.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401


def test_login_unknown_email(auth_client):
    response = auth_client.post("/api/auth/token", data={
        "username": "nobody@example.com",
        "password": "password"
    })
    assert response.status_code == 401
