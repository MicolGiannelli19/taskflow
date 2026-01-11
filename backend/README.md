# Taks Backend API

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

## Requirements

* Python 3.11+
* Docker & Docker Compose (for containerized setup)
* PostgreSQL 15+ (if running locally without Docker)

---

## Project Structure

```
backend/
├── main.py              # FastAPI app entry point
├── config.py            # Configuration and settings
├── database.py          # Database connection
├── models.py            # SQLAlchemy database models
├── schemas.py           # Pydantic validation schemas
├── auth.py              # Authentication utilities
├── dependencies.py      # Shared dependencies
├── routers/             # API route modules
│   ├── __init__.py
│   ├── auth.py         # Login/register endpoints
│   ├── boards.py       # Board management
│   ├── tickets.py      # Ticket CRUD operations
│   ├── columns.py      # Column management
│   └── comments.py     # Comment operations
├── requirements.txt     # Python dependencies
├── Dockerfile          # Docker configuration
└── .env.example        # Environment variables template
```

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

Make sure PostgreSQL is running, then create the database:

```bash
psql -U postgres
CREATE DATABASE taskflow_db;
CREATE USER taskflow_user WITH PASSWORD 'taskflow_pass';
GRANT ALL PRIVILEGES ON DATABASE taskflow_db TO taskflow_user;
\q
```

Run the database schema from `database/schema.sql`:

```bash
psql -U taskflow_user -d taskflow_db -f ../database/schema.sql
```

### 5. Run the Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

* **API**: http://localhost:8000
* **Interactive Docs**: http://localhost:8000/docs
* **ReDoc**: http://localhost:8000/redoc

---

## Setup - Docker (Recommended)

### 1. Ensure Docker is Running

```bash
docker info
```

### 2. Start All Services

From the project root directory:

```bash
docker compose up --build
```

This will start:
* **Backend API** → http://localhost:8000
* **PostgreSQL** → localhost:5432
* **Frontend** → http://localhost:5173 (if configured)

### 3. Development with Hot Reload

The Dockerfile is configured for development with automatic reload. Any code changes will be reflected immediately without restarting the container.

### 4. Stop Services

```bash
docker compose down
```

To remove volumes (database data):

```bash
docker compose down -v
```

---

## Database

### Connection Details

* **Host**: `db` (in Docker) or `localhost` (local)
* **Port**: `5432`
* **Database**: `taskflow_db`
* **User**: `taskflow_user`
* **Password**: `taskflow_pass`

### Schema

The database schema is located in `database/schema.sql` and includes:

* `users` - User accounts
* `boards` - taskflow boards
* `board_members` - Board access control
* `columns` - Board columns
* `tickets` - Tasks/tickets
* `comments` - Ticket comments
* `attachments` - File attachments

### Migrations

Currently using SQL scripts. Consider adding Alembic for migrations in production:

```bash
pip install alembic
alembic init migrations
```

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

#### Comments
* `POST /api/boards/{board_id}/tickets/{ticket_id}/comments` - Add comment

---

## Authentication

The API uses JWT (JSON Web Tokens) for authentication.

### Getting a Token

```bash
curl -X POST "http://localhost:8000/api/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user@example.com&password=yourpassword"
```

### Using the Token

Include the token in the Authorization header:

```bash
curl -X GET "http://localhost:8000/api/boards" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Development Tips

### Hot Reload

The server automatically reloads when you change any Python file. No need to restart!

### Database Inspection

Connect to the PostgreSQL database:

```bash
# In Docker
docker exec -it taskflow-db psql -U taskflow_user -d taskflow_db

# Local
psql -U taskflow_user -d taskflow_db
```

### View Logs

```bash
# Docker logs
docker compose logs -f backend

# Or just the app
docker logs -f taskflow-backend
```

### Testing Endpoints

Use the interactive Swagger UI at `/docs` or tools like:
* Postman
* Insomnia
* curl
* HTTPie

---

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Database
DATABASE_URL=postgresql://taskflow_user:taskflow_pass@db:5432/taskflow_db

# Security
SECRET_KEY=change-this-to-a-random-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Optional
DEBUG=True
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

**Important**: Never commit `.env` to version control!

---

## Production Deployment

### Security Checklist

- [ ] Change `SECRET_KEY` to a strong random value
- [ ] Set `DEBUG=False`
- [ ] Configure `ALLOWED_ORIGINS` to your frontend domain
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS
- [ ] Set up proper database backups
- [ ] Use a production-grade database (not the dev setup)
- [ ] Configure rate limiting

### Docker Production Build

Update the Dockerfile CMD to remove `--reload`:

```dockerfile
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Troubleshooting

### Database Connection Failed

* Check if PostgreSQL is running: `docker ps` or `pg_isready`
* Verify environment variables in `.env`
* Ensure database exists: `psql -l`

### Import Errors

* Make sure virtual environment is activated
* Reinstall dependencies: `pip install -r requirements.txt`

### Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000

# Kill the process
kill -9 <PID>
```

---

## TODO

- [ ] Add remaining router files (columns.py, comments.py)
- [ ] Implement file upload for attachments
- [ ] Add database migrations with Alembic
- [ ] Add unit tests with pytest
- [ ] Add rate limiting
- [ ] Add logging configuration
- [ ] Add email verification for registration
- [ ] Add password reset functionality
- [ ] Add board sharing/collaboration features
- [ ] Add websockets for real-time updates

---

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Test thoroughly
4. Submit a pull request
