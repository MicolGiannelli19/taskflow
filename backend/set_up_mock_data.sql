-- Run this in your database to set up test data

-- 1. Create mock user
INSERT INTO users (id, email, name,  avatar) 
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'mock@taskflow.com',
  'Mock User',
  NULL
) ON CONFLICT (id) DO NOTHING;

-- 2. Create test board
INSERT INTO boards (id, name, description, owner_id, created_at) 
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'My Test Board',
  'Development board for testing',
  '550e8400-e29b-41d4-a716-446655440000',
  CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

-- 3. Create board membership
INSERT INTO board_members (id, board_id, user_id, role, created_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440010',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440000',
  'owner',
  CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

-- 4. Create columns
INSERT INTO columns (id, board_id, name, position, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'To Do', 0, CURRENT_TIMESTAMP),
  ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'In Progress', 1, CURRENT_TIMESTAMP),
  ('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'Done', 2, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 5. Create test tickets
INSERT INTO tickets (id, board_id, column_id, title, description, position, priority, creator_id, created_at) VALUES
  (
    '550e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    'Setup React Frontend',
    '# Task Description\n\nSetup React with Vite and TailwindCSS\n\n## Steps\n- Install dependencies\n- Configure Tailwind\n- Create basic components',
    0,
    'high',
    '550e8400-e29b-41d4-a716-446655440000',
    CURRENT_TIMESTAMP
  ),
  (
    '550e8400-e29b-41d4-a716-446655440006',
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    'Design Database Schema',
    'Create PostgreSQL schema for boards, columns, and tickets',
    1,
    'high',
    '550e8400-e29b-41d4-a716-446655440000',
    CURRENT_TIMESTAMP
  ),
  (
    '550e8400-e29b-41d4-a716-446655440007',
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440003',
    'Build FastAPI Endpoints',
    '# API Development\n\nCreate REST endpoints for:\n- Boards\n- Tickets\n- Comments',
    0,
    'medium',
    '550e8400-e29b-41d4-a716-446655440000',
    CURRENT_TIMESTAMP
  ),
  (
    '550e8400-e29b-41d4-a716-446655440008',
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440004',
    'Setup Docker Compose',
    'Configure Docker for development environment',
    0,
    'low',
    '550e8400-e29b-41d4-a716-446655440000',
    CURRENT_TIMESTAMP
  )
ON CONFLICT (id) DO NOTHING;

-- 6. Add some test comments
INSERT INTO comments (id, ticket_id, user_id, content, created_at) VALUES
  (
    '550e8400-e29b-41d4-a716-446655440020',
    '550e8400-e29b-41d4-a716-446655440007',
    '550e8400-e29b-41d4-a716-446655440000',
    'Started working on this. Will have it done by end of day.',
    CURRENT_TIMESTAMP
  ),
  (
    '550e8400-e29b-41d4-a716-446655440021',
    '550e8400-e29b-41d4-a716-446655440008',
    '550e8400-e29b-41d4-a716-446655440000',
    'Docker setup is complete and working great!',
    CURRENT_TIMESTAMP
  )
ON CONFLICT (id) DO NOTHING;

-- Verify the data
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Boards', COUNT(*) FROM boards
UNION ALL
SELECT 'Columns', COUNT(*) FROM columns
UNION ALL
SELECT 'Tickets', COUNT(*) FROM tickets
UNION ALL
SELECT 'Comments', COUNT(*) FROM comments;