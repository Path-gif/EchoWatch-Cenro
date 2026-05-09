-- Add municipality column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS municipality VARCHAR(100);

-- Add index for municipality column
CREATE INDEX IF NOT EXISTS idx_users_municipality ON users(municipality);
