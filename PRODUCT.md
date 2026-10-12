# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Neurodivergent people, especially those with ADHD, who find mainstream task tools too rigid or too noisy to keep using. They come to TaskFlow to keep track of their work and see what needs doing next, often coming back after a context switch with little attention to spare. The author is one of these users and the first daily user, but design decisions serve this wider group, not one person's habits.

Secondary audiences, confirmed by the project's goals but not steering design: people evaluating the codebase as a full-stack engineering showcase, and collaborators invited onto shared boards.

## Product Purpose

TaskFlow is a task board in the spirit of Jira and Linear: boards hold columns, columns hold tickets, and tickets move across columns as work progresses. It exists because Jira is slow, mouse-heavy and built for process managers, and other tools are either noisy or have no usable free tier. For people whose attention is a scarce resource, those costs decide whether a tool gets used at all.

Success means a neurodivergent user keeps using it: they can capture a task, find their place again, and move work forward without the tool adding friction or noise.

The project is also a learning vehicle. New engineering topics (frontend patterns, security, real-time updates, testing) get built into the real product instead of throwaway demos. That shapes the roadmap but never justifies adding noise to the product.

## Positioning

Three binding commitments set TaskFlow apart from Jira and Linear:

- **Low-noise for ADHD.** Calm by default: few competing signals, nothing that nags, easy to re-enter after a context switch. Every added element has to earn its place against the attention it costs.
- **Keyboard-first.** Every core action should be reachable without the mouse. On the board this is built (arrow-key navigation, ⌘ combos, the ⌘K palette; see `docs/specs/keyboard-shortcuts.md`); new screens must keep it true.
- **Fast and detail-obsessed.** Speed and small interaction details (optimistic updates, instant feedback, ticket permalinks) are part of the product, not polish.

## Operating Context

- Used in a desktop browser during focused work and in quick check-ins between other tasks; the app is responsive and should hold up on smaller screens.
- Typical loop: open a board, scan the columns, open or create a ticket, edit its markdown description, comment, set a due date, and drag the ticket to its next column.
- Shared boards bring a few collaborators into the same board, each with a role.

## Capabilities and Constraints

**Built today:**
- Boards, columns and tickets, with drag and drop between columns (`@atlaskit/pragmatic-drag-and-drop`).
- Ticket fields: title, markdown description with a live-highlighting editor, priority, due date, assignee, comments.
- Ticket permalinks at `/board/:boardId/ticket/:ticketId`.
- Shared boards with four roles: `owner`, `admin`, `member`, `viewer`, enforced per route on the backend.
- Authentication fully delegated to Clerk (prebuilt `<SignIn />`, `<SignUp />`, `<UserProfile />`). There is no local-password mode.
- Board settings with member management: add members by searching users, see each member's role, remove members.
- Optimistic updates through React Query.
- A strict Content Security Policy on the app page (`frontend/csp.ts`, report-only for now) that any third-party script, style or font source must fit within.

**Planned or open, not yet built:**
- Editing a board's columns and their names.
- Board history (the route exists and shows a "coming soon" placeholder).
- User-facing error display, starting with sign-in.
- Real-time board updates across users.
- A public landing page in front of sign-in.

**Terminology:** board, column, ticket, comment, member, role (owner / admin / member / viewer).

## Brand Commitments

- Name: **TaskFlow**.
- An incumbent visual system exists (tokens in `frontend/src/index.css`, shadcn/ui primitives in `frontend/src/components/ui/`, synced to a Claude Design project via `.design-sync/`). It has not yet been recorded in DESIGN.md or confirmed as binding; `/impeccable document` records it.

## Evidence on Hand

- Seeded demo data: users `alice@example.com`, `bob@example.com` and others with boards, tickets and comments, created on first backend start.
- Project background and motivation: `README.md`, `docs/project-overview.md`, `docs/features.md`.
- No real users, testimonials, usage metrics, press or pricing exist. Future work must not invent any.

## Product Principles

1. **Attention is the scarcest resource.** Default to fewer, quieter signals; anything that competes for focus has to justify itself.
2. **Make re-entry effortless.** A user returning mid-task should see where they are and what is next without having to reconstruct it.
3. **Hands stay on the keyboard.** A core action that needs the mouse is unfinished.
4. **Speed is a feature.** Responses feel instant; the UI never makes the user wait to see the result of their own action.
5. **Learning never costs the user.** Engineering experiments go into the product only when they leave the experience calmer or faster, never noisier.

## Accessibility & Inclusion

No formal standard has been set yet (best effort). The product's purpose already makes attention-related needs central: low distraction, clear state, and a full keyboard path come from Positioning and Product Principles, not from a compliance target. Whether to adopt a formal target, such as WCAG 2.2 AA, is still open.
