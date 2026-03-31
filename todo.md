# TODO List of the next steps for my project

- Retrive data from the api in the frontend
  - Create a libarary that can call the following endpoint

11/01  
- Get some backend tests make sure you can call the follwoing api end point: 
```bash
curl http://localhost:8000/api/boards/550e8400-e29b-41d4-a716-446655440001
```
- Fix the issue where I changed the name of the coloumn table to avoid conflict 


# Fix Data model defenition
# TODO: Migrate from init.sql to Alembic Migrations

## Context
Currently using `init.sql` for rapid MVP iteration. Need to transition to proper migration management before production.

## When to Start This Task
- [ ] Schema changes are becoming less frequent (< 1 change per week)
- [ ] Have real users or data that can't be lost
- [ ] Approaching production deployment
- [ ] Need to deploy updates without recreating database

## Pre-Migration Checklist
- [ ] Document current database schema completely
- [ ] Back up any important test/staging data
- [ ] Ensure all team members are aware of the transition
- [ ] Set aside 2-4 hours for the migration work

## Migration Steps

### 1. Setup Alembic
- [ ] Install Alembic: `pip install alembic`
- [ ] Add to `requirements.txt`
- [ ] Initialize Alembic: `alembic init alembic`
- [ ] Configure `alembic.ini` with database URL

### 2. Organize Code Structure
- [ ] Create `backend/app/models/` directory
- [ ] Split models into:
  - [ ] `database.py` - SQLAlchemy ORM models (source of truth)
  - [ ] `schemas.py` - Pydantic models (API validation)
- [ ] Update imports across the application

### 3. Convert init.sql to SQLAlchemy Models
- [ ] Create SQLAlchemy Base model
- [ ] Convert each table in `init.sql` to SQLAlchemy model class
- [ ] Add relationships, indexes, and constraints
- [ ] Test models can create expected schema

### 4. Create Initial Migration
- [ ] Generate initial migration: `alembic revision --autogenerate -m "Initial schema"`
- [ ] Review generated migration file
- [ ] Test migration on fresh database: `alembic upgrade head`
- [ ] Verify schema matches old `init.sql`

### 5. Update Development Workflow
- [ ] Remove `init.sql` or move to `database/archive/`
- [ ] Update Docker Compose to not use `init.sql`
- [ ] Update README with new migration commands
- [ ] Create script for running migrations in development
- [ ] Document migration workflow for team

### 6. Update CI/CD (if applicable)
- [ ] Add migration step to deployment pipeline
- [ ] Test migrations run correctly in staging
- [ ] Create rollback procedure documentation

### 7. Testing & Validation
- [ ] Test creating database from scratch with migrations
- [ ] Test upgrading from previous schema version
- [ ] Test downgrading migrations (rollback)
- [ ] Verify all existing API endpoints still work

## Common Alembic Commands to Remember

```bash
# Create a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history

# View current version
alembic current
```

## Resources
- [ ] Read Alembic tutorial: https://alembic.sqlalchemy.org/en/latest/tutorial.html
- [ ] Review SQLAlchemy relationships: https://docs.sqlalchemy.org/en/20/orm/relationships.html
- [ ] Bookmark FastAPI with SQLAlchemy guide: https://fastapi.tiangolo.com/tutorial/sql-databases/

## Notes
- Keep `init.sql` in git history for reference
- Consider creating a backup before first production migration
- Test migrations thoroughly in staging environment first

---

**Status**: Not Started  
**Priority**: Medium (do before production)  
**Estimated Time**: 3-4 hours  
**Dependencies**: Schema stabilization



# Username / @mentions decision

- No `username` field needed for MVP
- `name` + `avatar` is sufficient for identifying users in a board context
- If @mentions are added to ticket comments in future → add `username` (unique, lowercase, URL-safe) to `users` table at that point
- If public profile URLs are needed → same trigger

---

# EPIC: DESIGN A WAY TO MAKE SHORT CUTS A CENTRAL FEATURE OF THIS

# EPIC : Add tests to fast api application 

# EPIC : Document and finalize authorazation model 

# EPIC : Set up the database in a a more scalable and fast API native way

# THINK of a pattern where coloums have the standard names and then these can be changed to new names