# Project overview

## Why this project exists

TaskFlow came from two motivations at once.

The first is personal. ADHD makes it genuinely hard to stay on top of work, side projects and everyday life, and most task tools are either too rigid or too noisy:

- Jira is built for process managers, not engineers. It is slow, mouse-heavy and has no love for keyboard shortcuts.
- Asana is a joy to use but has no sensible free tier for personal use.
- Linear is closest to the ideal: opinionated, fast and keyboard-first. It has since launched a free plan that probably would have removed the motivation to build this at all.

The goal is a tool that fits the way an engineer's brain works. It should be fast, keyboard-friendly, detail-obsessed, and flexible enough to hold work and personal life without becoming more noise.

The second motivation is professional. This is a deliberately versatile full-stack app: a place to put new engineering concepts into practice, such as a frontend pattern, a security feature or real-time updates, instead of building throwaway demos. The point is for the product and the skills to grow together.

## Project objective

The objective is a complete end-to-end application. The focus is on building frontend skills while showing the ability to build a full-stack React and FastAPI application, including drag-and-drop interfaces, REST APIs and database work.

## Engineering topics to explore

- **React patterns**: optimistic UI updates, lifting state up, props drilling vs Context, custom hooks, compound components, React Query for server state
- **Authentication and security**: delegated auth (Clerk), RBAC (role-based access control), CSRF protection, rate limiting, secure storage patterns
- **Drag-and-drop**: `@dnd-kit` integration, accessible drag-and-drop, persisting position and ordering
- **Real-time updates**: WebSockets or Server-Sent Events for live board updates across users
- **Testing**: component testing with React Testing Library, API integration tests, end-to-end tests with Playwright
- **Performance**: code splitting, lazy loading, virtualised lists for large boards
- **TypeScript**: progressive strictness, discriminated unions, utility types
- **DevOps and deployment**: CI/CD pipeline, containerisation, environment promotion (dev → staging → prod)

## Features

The more advanced features are described in [features.md](./features.md).

### Frontend

- Basic board, column and ticket management
- Responsive design
- Single-page application behaviour
- Drag and drop to move tickets between columns

### Backend

- FastAPI REST API
- PostgreSQL database for persistent storage
- Clerk-delegated authentication, mapped onto local users via `user_identities`
- User, board, column, ticket and comment management
- Dockerized for easy development and deployment
