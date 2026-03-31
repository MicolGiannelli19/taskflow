import uuid


def test_health_check(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "taskflow API is running"}


def test_get_boards_empty(client):
    response = client.get("/api/boards")
    assert response.status_code == 200
    assert response.json() == []


def test_create_board(client):
    response = client.post("/api/boards", json={
        "name": "My Board",
        "description": "A test board"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "My Board"
    assert data["description"] == "A test board"
    assert "id" in data


def test_create_board_minimal(client):
    response = client.post("/api/boards", json={"name": "Minimal Board"})
    assert response.status_code == 200
    assert response.json()["name"] == "Minimal Board"


def test_get_boards_returns_created(client):
    client.post("/api/boards", json={"name": "Board A"})
    client.post("/api/boards", json={"name": "Board B"})
    response = client.get("/api/boards")
    assert response.status_code == 200
    names = [b["name"] for b in response.json()]
    assert "Board A" in names
    assert "Board B" in names


def test_get_board_by_id(client):
    created = client.post("/api/boards", json={"name": "Specific Board"}).json()
    response = client.get(f"/api/boards/{created['id']}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == created["id"]
    assert data["name"] == "Specific Board"
    assert "columns" in data
    assert "tickets" in data


def test_get_board_not_found(client):
    response = client.get(f"/api/boards/{uuid.uuid4()}")
    assert response.status_code == 404
