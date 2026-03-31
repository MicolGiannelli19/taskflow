# Taskflow Backend API

FastAPI backend service for the taskflow board application with PostgreSQL database.

---

## Features

* RESTful API built with FastAPI
* PostgreSQL database with SQLAlchemy ORM
* JWT authentication
* Automatic API documentation (Swagger UI)
* Dockerized for easy development and deployment
* Hot reload in development mode

---

## Tech Stack

* **FastAPI** - Modern Python web framework
* **SQLAlchemy** - SQL toolkit and ORM
* **PostgreSQL** - Relational database
* **Pydantic** - Data validation
* **JWT** - Authentication tokens
* **Uvicorn** - ASGI server

---

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Configuration and settings
│   ├── database.py          # Database connection
│   ├── models.py            # SQLAlchemy database models
│   ├── schemas.py           # Pydantic validation schemas
│   ├── auth_utils.py        # Authentication utilities
│   ├── dependencies.py      # Shared dependencies
│   └── routers/             # API route modules
│       ├── __init__.py
│       ├── auth.py          # Login/register endpoints
│       ├── board.py         # Board management
│       └── ticket.py        # Ticket CRUD operations
├── requirements.txt         # Python dependencies
└── Dockerfile               # Docker configuration
```

---

## Setup - Docker (recommended)

See the [main README](../README.md) for Docker setup instructions.

---

## Setup - Local Development (without Docker)

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate     # Windows
```

### 2. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file in the backend directory:

```env
DATABASE_URL=postgresql://taskflow_user:taskflow_pass@localhost:5432/taskflow_db
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### 4. Set Up Database

See the [database README](../database/README.md) for schema and seed setup instructions.

### 5. Run the Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

* **API**: http://localhost:8000
* **Interactive Docs**: http://localhost:8000/docs
* **ReDoc**: http://localhost:8000/redoc

---

## API Documentation

FastAPI automatically generates interactive API documentation:

* **Swagger UI**: http://localhost:8000/docs
* **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

#### Authentication
* `POST /api/auth/register` - Register new user
* `POST /api/auth/token` - Login and get JWT token

#### Boards
* `GET /api/boards` - List all boards
* `GET /api/boards/{board_id}` - Get board with columns and tickets
* `POST /api/boards` - Create new board

#### Tickets
* `GET /api/boards/{board_id}/tickets/{ticket_id}` - Get ticket details
* `POST /api/boards/{board_id}/tickets` - Create new ticket
* `PATCH /api/boards/{board_id}/tickets/{ticket_id}` - Update ticket
* `DELETE /api/boards/{board_id}/tickets/{ticket_id}` - Delete ticket

---

## Authentication

The API uses JWT (JSON Web Tokens). Credentials are stored in the `user_identities` table, which supports multiple providers per user (password, Google, GitHub).

For a full explanation of the auth flow see [docs/auth.md](./docs/auth.md).

### Getting a Token

```bash
curl -X POST "http://localhost:8000/api/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=alice@example.com&password=password123"
```

### Using the Token

```bash
curl -X GET "http://localhost:8000/api/boards" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Development Tips

### View Logs

```bash
docker logs -f taskflow-backend
```

### Database Inspection

```bash
docker exec -it taskflow-db psql -U taskflow_user -d taskflow_db
```

### Testing Endpoints

Use the interactive Swagger UI at `/docs` or tools like Postman, Insomnia, or curl.

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://taskflow_user:taskflow_pass@db:5432/taskflow_db

# Security
SECRET_KEY=change-this-to-a-random-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

**Important**: Never commit `.env` to version control.

---

## Production Deployment

### Security Checklist

- [ ] Change `SECRET_KEY` to a strong random value
- [ ] Update `allow_origins` in `main.py` to your production frontend domain
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS
- [ ] Set up database backups
- [ ] Configure rate limiting
- [ ] Remove `--reload` flag from uvicorn

---

## Troubleshooting

### Database Connection Failed

* Check if PostgreSQL is running: `docker ps` or `pg_isready`
* Verify environment variables
* Ensure database exists: `psql -l`

### Import Errors

* Make sure virtual environment is activated
* Reinstall dependencies: `pip install -r requirements.txt`

### Port Already in Use

```bash
lsof -i :8000
kill -9 <PID>
```
