-- ============================================
-- EcoWatch PostgreSQL Database Migration Script
-- Compatible with PostgreSQL 12+ and pgAdmin 4
-- ============================================
-- Usage:
-- 1. Create a new database: CREATE DATABASE ecowatch;
-- 2. Connect to the database: \c ecowatch
-- 3. Run this script: \i backend/db/migration_export.sql
-- Or in pgAdmin: Open Query Tool, paste content, Execute
-- ============================================

-- Set timezone for consistency
SET timezone = 'Asia/Manila';

-- ============================================
-- TABLE: users (Citizen accounts)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    email VARCHAR(100) UNIQUE,
    municipality VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_municipality ON users(municipality);

-- ============================================
-- TABLE: admin_users (DENR Admin accounts)
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- ============================================
-- TABLE: otps (One-time passwords for SMS)
-- ============================================
CREATE TABLE IF NOT EXISTS otps (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otps_phone_code ON otps(phone, code);
CREATE INDEX IF NOT EXISTS idx_otps_expires ON otps(expires_at) WHERE used = FALSE;

-- ============================================
-- TABLE: categories (Violation categories)
-- ============================================
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

ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Insert default categories with conflict handling (using ASCII-safe emojis)
INSERT INTO categories (name, description, icon_emoji, color_code) VALUES
    ('Illegal Cutting', 'Unauthorized logging and tree cutting activities', 'Tree', '#10B981'),
    ('Illegal Occupation', 'Illegal settlement and land occupation', 'Home', '#F59E0B'),
    ('Pollution', 'Air, water, or soil pollution incidents', 'Water', '#3B82F6'),
    ('Wildlife Poaching', 'Illegal hunting and animal trafficking', 'Wildlife', '#8B5CF6'),
    ('Mining Violation', 'Illegal or improper mining activities', 'Mining', '#EF4444'),
    ('Waste Dumping', 'Illegal waste disposal and littering', 'Waste', '#6B7280')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- TABLE: reports (Environmental violation reports)
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_reports_reference ON reports(reference_number);
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category_id);

-- ============================================
-- TABLE: report_media (Media attachments)
-- ============================================
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

ALTER TABLE report_media ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE report_media ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE report_media ALTER COLUMN file_url DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_report_media_report ON report_media(report_id);

-- ============================================
-- TABLE: report_activities (Audit trail)
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_report_activities_report ON report_activities(report_id);
CREATE INDEX IF NOT EXISTS idx_report_activities_admin ON report_activities(admin_id);

-- ============================================
-- TABLE: system_settings (Configuration)
-- ============================================
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
    ('site_name', 'DENR EcoWatch', 'Website name'),
    ('site_logo', '/logo.png', 'Logo file path'),
    ('contact_email', 'denr-ecowatch@gov.ph', 'Contact email'),
    ('contact_phone', '+63 123 456 7890', 'Contact phone'),
    ('otp_expiry_minutes', '10', 'OTP code expiry in minutes'),
    ('max_media_per_report', '5', 'Maximum media files per report'),
    ('allowed_media_types', 'image/jpeg,image/png,video/mp4', 'Allowed media MIME types')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================
-- VERIFY ALL TABLES CREATED
-- ============================================
SELECT 'Database migration completed successfully!' AS status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
