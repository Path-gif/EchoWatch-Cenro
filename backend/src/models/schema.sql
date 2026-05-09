-- ============================================
-- DENR CENRO Environmental Reporting Database
-- PostgreSQL Schema for Citizen Portal
-- ============================================

-- Citizens/Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  email VARCHAR(100) UNIQUE,
  municipality TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Admin users table (email/password)
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- OTP codes for SMS verification
CREATE TABLE IF NOT EXISTS otps (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Violation categories/types
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon_emoji VARCHAR(10),
  color_code VARCHAR(7),
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Environmental violation reports
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
  is_anonymous BOOLEAN DEFAULT false,
  media_count INTEGER DEFAULT 0,
  assigned_to_admin_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  resolution_date TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Media attachments (photos/videos of violations)
CREATE TABLE IF NOT EXISTS report_media (
  id SERIAL PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  media_type VARCHAR(20),
  file_path TEXT,
  file_url TEXT,
  file_name VARCHAR(255),
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_by_user BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Report activity log (for tracking status changes, assignments, etc.)
CREATE TABLE IF NOT EXISTS report_activities (
  id SERIAL PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  admin_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  activity_type VARCHAR(50),
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- System settings/configuration
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- Indexes for performance optimization
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_otps_phone_code ON otps(phone, code);
CREATE INDEX IF NOT EXISTS idx_reports_reference ON reports(reference_number);
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_report_media_report ON report_media(report_id);

-- ============================================
-- Insert default violation categories
-- ============================================
INSERT INTO categories (name, description, icon_emoji, color_code) VALUES
  ('Illegal Cutting', 'Unauthorized logging and tree cutting activities', 'Tree', '#10B981'),
  ('Illegal Occupation', 'Illegal settlement and land occupation', 'Home', '#F59E0B'),
  ('Pollution', 'Air, water, or soil pollution incidents', 'Water', '#3B82F6'),
  ('Wildlife Poaching', 'Illegal hunting and animal trafficking', 'Wildlife', '#8B5CF6'),
  ('Mining Violation', 'Illegal or improper mining activities', 'Mining', '#EF4444'),
  ('Waste Dumping', 'Illegal waste disposal and littering', 'Waste', '#6B7280')
ON CONFLICT (name) DO NOTHING;
