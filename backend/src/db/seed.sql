INSERT INTO workers (username, password_hash, full_name, role)
VALUES
(
  'admin',
  '$2b$10$REPLACE_WITH_HASH',
  'Admin User',
  'admin'
),
(
  'desktop1',
  '$2b$10$REPLACE_WITH_HASH',
  'Desktop User',
  'desktop'
),
(
  'scanner1',
  '$2b$10$REPLACE_WITH_HASH',
  'Scanner User',
  'scanner'
);