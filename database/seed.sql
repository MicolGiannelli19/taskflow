-- Seed data for local development
-- Default password for all users: password123

-- Users
INSERT INTO users (id, email, name, avatar) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'alice@example.com', 'Alice Johnson', 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice'),
  ('a0000000-0000-0000-0000-000000000002', 'bob@example.com',   'Bob Smith',    'https://api.dicebear.com/7.x/avataaars/svg?seed=bob'),
  ('a0000000-0000-0000-0000-000000000003', 'carol@example.com', 'Carol White',  'https://api.dicebear.com/7.x/avataaars/svg?seed=carol');

-- User identities (password = "password123", hashed with bcrypt)
INSERT INTO user_identities (user_id, provider, provider_id, password_hash) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'password', 'alice@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VK.s2Qkmi'),
  ('a0000000-0000-0000-0000-000000000002', 'password', 'bob@example.com',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VK.s2Qkmi'),
  ('a0000000-0000-0000-0000-000000000003', 'password', 'carol@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VK.s2Qkmi');

-- Board
INSERT INTO boards (id, name, description, owner_id) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Taskflow MVP', 'Main development board', 'a0000000-0000-0000-0000-000000000001');

-- Board members
INSERT INTO board_members (board_id, user_id, role) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'owner'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'member'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'member');

-- Columns
INSERT INTO columns (id, board_id, name, position) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Backlog',     0),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'In Progress', 1),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'In Review',   2),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Done',        3);

-- Tickets
INSERT INTO tickets (id, board_id, column_id, title, description, position, priority, assignee_id, creator_id) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
    'Set up CI/CD pipeline', 'Configure GitHub Actions for automated testing and deployment.', 0, 'high',
    'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001'),

  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
    'Write API documentation', 'Document all REST endpoints using OpenAPI/Swagger.', 1, 'medium',
    'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001'),

  ('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002',
    'Implement auth endpoints', 'Build login, register, and token refresh endpoints.', 0, 'high',
    'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),

  ('e0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002',
    'Build kanban board UI', 'Drag and drop columns and tickets using the board API.', 1, 'high',
    'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001'),

  ('e0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003',
    'Database schema design', 'Design and document the initial PostgreSQL schema.', 0, 'medium',
    'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),

  ('e0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004',
    'Project scaffolding', 'Set up FastAPI backend and React frontend with Docker.', 0, 'low',
    'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001');

-- Comments
INSERT INTO comments (ticket_id, user_id, content) VALUES
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Should we use JWT or sessions? I prefer JWT for the stateless approach.'),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'JWT with refresh tokens — already planned in the schema.'),
  ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 'Are we using a drag and drop library or building it from scratch?'),
  ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Looking at dnd-kit, seems lightweight and well maintained.');
