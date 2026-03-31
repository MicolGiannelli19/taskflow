# TaskFlow - Jira Board for React Practice

## Project Objective
The objective of this project is to create a full end-to-end application, focusing on gaining additional frontend skills while demonstrating the ability to build a full-stack React and FastAPI application. This includes working with drag-and-drop interfaces, REST APIs, and database interactions.

---

# Run project on local host

# TODO clean these up from backedn files 


TODO Move this to the main read me 
### 2. Start All Services

From the project root directory:

```bash
docker compose up --build
```

This will start:
* **Backend API** → http://localhost:8000
* **PostgreSQL** → localhost:5432
* **Frontend** → http://localhost:5173 (if configured)


## Frontend Features

### Standard Requirements
- Basic board, column, and ticket management
- Responsive design
- Single-page application behavior

### Additional Features
- Drag-and-drop support for tickets and columns
- Optimistic UI updates for faster user feedback
- Clean and intuitive single-page application design

---

## Backend Features
- FastAPI REST API
- PostgreSQL database for persistent storage
- User, board, column, ticket, and comment management
- Automatic timestamp updates via triggers
- Dockerized for easy development and deployment
