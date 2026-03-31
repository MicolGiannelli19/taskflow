# TaskFlow - Jira Board for React Practice

## Project Objective
The objective of this project is to create a full end-to-end application, focusing on gaining additional frontend skills while demonstrating the ability to build a full-stack React and FastAPI application. This includes working with drag-and-drop interfaces, REST APIs, and database interactions.

---

## Running Locally

### Start all services

From the project root:

```bash
docker compose up
```

This starts:
* **Frontend** → http://localhost:5173
* **Backend API** → http://localhost:8000
* **PostgreSQL** → localhost:5432

The database is automatically initialised with the schema and seeded with mock data on first run.

### Reset the database

To wipe and re-seed the database:

```bash
docker compose down -v && docker compose up
```

### Stop services

```bash
docker compose down
```

---

## Frontend Features

- Basic board, column, and ticket management
- Responsive design
- Single-page application behavior
- Drag-and-drop support for tickets and columns

---

## Backend Features

- FastAPI REST API
- PostgreSQL database for persistent storage
- JWT authentication with support for password and OAuth providers
- User, board, column, ticket, and comment management
- Dockerized for easy development and deployment

---

## Further Documentation

- [Backend README](./backend/README.md)
