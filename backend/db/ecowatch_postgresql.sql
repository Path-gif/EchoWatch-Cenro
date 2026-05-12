-- ============================================
-- EcoWatch PostgreSQL Database Schema
-- Safe to run on a new or existing PostgreSQL database.
-- PostgreSQL 12+
-- ============================================

SET timezone = 'Asia/Manila';

BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'citizen',
  email VARCHAR(100) UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'citizen';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;
UPDATE users SET name = full_name WHERE name IS NULL AND full_name IS NOT NULL;
UPDATE users SET role = 'citizen' WHERE role IS NULL;

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS email VARCHAR(100);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'admin';
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS otps (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon_emoji VARCHAR(10),
  color_code VARCHAR(7),
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon_emoji VARCHAR(10);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS color_code VARCHAR(7);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  reference_number VARCHAR(50) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
  violation_type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  manual_location TEXT,
  status VARCHAR(50) DEFAULT 'submitted',
  priority VARCHAR(20) DEFAULT 'normal',
  is_anonymous BOOLEAN DEFAULT FALSE,
  media_count INTEGER DEFAULT 0,
  assigned_to_admin_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  resolution_date TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reports ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS category_id INTEGER;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS violation_type VARCHAR(100);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS manual_location TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'submitted';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS media_count INTEGER DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS assigned_to_admin_id INTEGER;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolution_date TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS report_media (
  id SERIAL PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  media_type VARCHAR(20),
  file_path TEXT,
  file_url TEXT,
  file_name VARCHAR(255),
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_by_user BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE report_media ADD COLUMN IF NOT EXISTS media_type VARCHAR(20);
ALTER TABLE report_media ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE report_media ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE report_media ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
ALTER TABLE report_media ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE report_media ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
ALTER TABLE report_media ADD COLUMN IF NOT EXISTS uploaded_by_user BOOLEAN DEFAULT FALSE;
ALTER TABLE report_media ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE report_media ALTER COLUMN file_url DROP NOT NULL;

CREATE TABLE IF NOT EXISTS report_activities (
  id SERIAL PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  admin_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  activity_type VARCHAR(50),
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_verifications (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users (LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_otps_phone_code ON otps(phone, code);
CREATE INDEX IF NOT EXISTS idx_otps_expires ON otps(expires_at) WHERE used = FALSE;
CREATE INDEX IF NOT EXISTS idx_reports_reference ON reports(reference_number);
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category_id);
CREATE INDEX IF NOT EXISTS idx_report_media_report ON report_media(report_id);
CREATE INDEX IF NOT EXISTS idx_report_activities_report ON report_activities(report_id);
CREATE INDEX IF NOT EXISTS idx_report_activities_admin ON report_activities(admin_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email_code ON email_verifications(LOWER(email), code);

INSERT INTO categories (name, description, icon_emoji, color_code) VALUES
  ('Illegal Cutting', 'Unauthorized logging and tree cutting activities', 'Tree', '#10B981'),
  ('Illegal Occupation', 'Illegal settlement and land occupation', 'Home', '#F59E0B'),
  ('Pollution', 'Air, water, or soil pollution incidents', 'Water', '#3B82F6'),
  ('Wildlife Poaching', 'Illegal hunting and animal trafficking', 'Wildlife', '#8B5CF6'),
  ('Mining Violation', 'Illegal or improper mining activities', 'Mining', '#EF4444'),
  ('Waste Dumping', 'Illegal waste disposal and littering', 'Waste', '#6B7280')
ON CONFLICT (name) DO NOTHING;

INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('site_name', 'DENR EcoWatch', 'Website name'),
  ('site_logo', '/logo.png', 'Logo file path'),
  ('contact_email', 'denr-ecowatch@gov.ph', 'Contact email'),
  ('contact_phone', '+63 123 456 7890', 'Contact phone'),
  ('otp_expiry_minutes', '10', 'OTP code expiry in minutes'),
  ('max_media_per_report', '5', 'Maximum media files per report'),
  ('allowed_media_types', 'image/jpeg,image/png,video/mp4', 'Allowed media MIME types')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO admin_users (email, password_hash, name, role, is_active, created_at, updated_at)
VALUES (
  'admin@gmail.com',
  '$2a$10$lcZzDzLE8EvzwDyOP1Umq.q.4TbLbB00gzFBQbkIQ6a.ZUcv7Te0G',
  'DENR Admin',
  'admin',
  TRUE,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO admin_users (email, password_hash, name, role, is_active, created_at, updated_at)
VALUES (
  'admin@admin.com',
  '$2a$10$lcZzDzLE8EvzwDyOP1Umq.q.4TbLbB00gzFBQbkIQ6a.ZUcv7Te0G',
  'DENR Admin',
  'admin',
  TRUE,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    is_active = TRUE,
    updated_at = NOW();

COMMIT;

SELECT 'EcoWatch database schema loaded successfully.' AS status;
