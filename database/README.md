# Database

PostgreSQL database for the Taskflow application.

---

## Files

* `init.sql` — schema definition, creates all tables and indexes
* `seed.sql` — mock data for local development
* `schema.dbml` — visual schema for [dbdiagram.io](https://dbdiagram.io)

---

## Schema

### Tables

* `users` - User profiles (name, email, avatar)
* `user_identities` - Auth credentials, supports multiple providers per user (password, Google, GitHub)
* `boards` - Taskflow boards
* `board_members` - Board access control (owner, admin, member, viewer)
* `columns` - Columns within a board
* `tickets` - Tasks/tickets within a column
* `comments` - Comments on tickets

### Auth design

Credentials are separated from user profiles. A single user can have multiple identities (e.g. login with Google and password). The `provider` field identifies the auth method and `password_hash` is only populated for `provider = 'password'`.

---

## Connection Details

| | Value |
|---|---|
| Host | `db` (Docker) / `localhost` (local) |
| Port | `5432` |
| Database | `taskflow_db` |
| User | `taskflow_user` |
| Password | `taskflow_pass` |

---

## Local Setup (without Docker)

```bash
psql -U postgres
CREATE DATABASE taskflow_db;
CREATE USER taskflow_user WITH PASSWORD 'taskflow_pass';
GRANT ALL PRIVILEGES ON DATABASE taskflow_db TO taskflow_user;
\q
```

Run the schema and seed data:

```bash
psql -U taskflow_user -d taskflow_db -f init.sql
psql -U taskflow_user -d taskflow_db -f seed.sql
```

---

## Seed Data

The seed data creates 3 users, 1 board, 4 columns, 6 tickets and 4 comments for local development.

| Email | Password |
|---|---|
| alice@example.com | password123 |
| bob@example.com | password123 |
| carol@example.com | password123 |

---

## Inspecting the Database

```bash
# Connect via Docker
docker exec -it taskflow-db psql -U taskflow_user -d taskflow_db

# Useful commands
\dt          # list tables
\d users     # describe a table
```

---

## Migrations

Currently using plain SQL scripts. For production, consider Alembic:

```bash
pip install alembic
alembic init migrations
```
