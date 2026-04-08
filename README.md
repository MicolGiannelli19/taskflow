# TaskFlow

## Why This Project Exists

TaskFlow started from two places at once.

The first is personal — having ADHD makes it genuinely hard to stay on top of work, side projects, and everyday life. Most task tools feel either too rigid or too noisy. And tools like Jira, while powerful, are built for process managers, not engineers. They're slow, mouse-heavy, and buried under layers of UI that get in the way of just getting things done. There's no love for keyboard shortcuts, no respect for the user's attention, and no sense that the person using it might actually care about the details. Asana gets closer to the mark — it's genuinely fun to use, thoughtful, and has a polish that makes the experience feel rewarding rather than punishing. But it doesn't have a free tier that makes sense for personal use. Linear is the closest thing to the ideal: opinionated, fast, keyboard-first, and built by people who clearly use it themselves. Notably, Linear has since launched a free plan — something that didn't exist when this project started, which would have probably killed the motivation to build this at all. The goal here is to build something that fits the way an engineer's brain works: fast, keyboard-friendly, organized for people who notice when things are off by a pixel, and flexible enough to track work and personal life without becoming another source of noise.

The second is professional. This project is a deliberate collection of software engineering skills put into practice. It's a full-stack application intentionally kept versatile so that any new concept — a new frontend pattern, a security feature, a real-time update mechanism — can be introduced here rather than in a throwaway demo. The product growing in usefulness and the engineering skills growing together is the point.

---

## Engineering Topics to Explore

- **React patterns** — optimistic UI updates, lifting state up, props drilling vs Context, custom hooks, compound components, React Query for server state
- **Authentication & security** — JWT lifecycle, OAuth providers, RBAC (role-based access control), CSRF protection, rate limiting, secure storage patterns
- **Drag-and-drop** — `@dnd-kit` integration, accessible DnD, position/ordering persistence
- **Real-time updates** — WebSockets or Server-Sent Events for live board updates across users
- **Testing** — component testing with React Testing Library, API integration tests, E2E with Playwright
- **Performance** — code splitting, lazy loading, virtualised lists for large boards
- **TypeScript** — progressive strictness, discriminated unions, utility types
- **DevOps & deployment** — CI/CD pipeline, containerisation, environment promotion (dev → staging → prod)

---

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


## Epic 
I am worried the types file will get coonfusing as the frontend code go - e.g. I have a user interface for doing authetication but I will also need a user interface for the profile information I want to edit this going forward so I am furher aligned to patterns 