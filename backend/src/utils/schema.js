const DEFAULT_CITIZEN_HASH = '$2a$10$HXeRxA6tNo/ZoC3TKzbL4Ow6okvIJsmWe1f6Gd8R3gUqjeU/i23ai';
const DEFAULT_ADMIN_HASH = '$2a$10$lcZzDzLE8EvzwDyOP1Umq.q.4TbLbB00gzFBQbkIQ6a.ZUcv7Te0G';

let schemaReadyPromise = null;

async function ensureDatabaseSchema(db) {
  if (!schemaReadyPromise) {
    schemaReadyPromise = createSchema(db).catch((error) => {
      schemaReadyPromise = null;
      throw error;
    });
  }

  return schemaReadyPromise;
}

async function createSchema(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      phone VARCHAR(20) UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT,
      full_name TEXT,
      role TEXT DEFAULT 'citizen',
      email VARCHAR(100) UNIQUE,
      municipality TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      last_login TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS municipality TEXT');
  await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT');
  await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'citizen'");
  await db.query('UPDATE users SET name = full_name WHERE name IS NULL AND full_name IS NOT NULL');
  await db.query("UPDATE users SET role = 'citizen' WHERE role IS NULL");

  await db.query(`
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
    )
  `);

  await db.query(`
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
    )
  `);

  await db.query(`
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
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS report_media (
      id SERIAL PRIMARY KEY,
      report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      media_type VARCHAR(20),
      file_path TEXT,
      file_url TEXT,
      file_data BYTEA,
      file_name VARCHAR(255),
      file_size INTEGER,
      mime_type VARCHAR(100),
      uploaded_by_user BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.query('ALTER TABLE report_media ADD COLUMN IF NOT EXISTS file_data BYTEA');

  await db.query(`
    CREATE TABLE IF NOT EXISTS report_activities (
      id SERIAL PRIMARY KEY,
      report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      admin_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
      activity_type VARCHAR(50),
      old_status VARCHAR(50),
      new_status VARCHAR(50),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS otps (
      id SERIAL PRIMARY KEY,
      phone VARCHAR(20) NOT NULL,
      code VARCHAR(6) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id SERIAL PRIMARY KEY,
      setting_key VARCHAR(100) UNIQUE NOT NULL,
      setting_value TEXT,
      description TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS email_verifications (
      id SERIAL PRIMARY KEY,
      email VARCHAR(100) NOT NULL,
      code VARCHAR(6) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.query('CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  await db.query('CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users (LOWER(email)) WHERE email IS NOT NULL');
  await db.query('CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_report_media_report ON report_media(report_id)');

  await db.query(`
    INSERT INTO categories (name, description, icon_emoji, color_code) VALUES
      ('Illegal Cutting', 'Unauthorized logging and tree cutting activities', 'Tree', '#10B981'),
      ('Illegal Occupation', 'Illegal settlement and land occupation', 'Home', '#F59E0B'),
      ('Pollution', 'Air, water, or soil pollution incidents', 'Water', '#3B82F6'),
      ('Wildlife Poaching', 'Illegal hunting and animal trafficking', 'Wildlife', '#8B5CF6'),
      ('Mining Violation', 'Illegal or improper mining activities', 'Mining', '#EF4444'),
      ('Waste Dumping', 'Illegal waste disposal and littering', 'Waste', '#6B7280')
    ON CONFLICT (name) DO NOTHING
  `);

  await db.query(
    `UPDATE users
     SET email = $1,
         password_hash = $2,
         updated_at = NOW()
     WHERE LOWER(email) = LOWER($1)`,
    ['Citizen@gmail.com', DEFAULT_CITIZEN_HASH]
  );

  await db.query(
    `INSERT INTO users (phone, email, password_hash, name, full_name, role, municipality, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $4, 'citizen', $5, NOW(), NOW())
     ON CONFLICT (email) DO UPDATE
     SET password_hash = EXCLUDED.password_hash,
         name = EXCLUDED.name,
         full_name = EXCLUDED.full_name,
         role = EXCLUDED.role,
         municipality = EXCLUDED.municipality,
         updated_at = NOW()`,
    ['09170000001', 'Citizen@gmail.com', DEFAULT_CITIZEN_HASH, 'Citizen User', 'Olongapo']
  );

  await db.query(
    `UPDATE admin_users
     SET email = $1,
         password_hash = $2,
         is_active = TRUE,
         updated_at = NOW()
     WHERE LOWER(email) = LOWER($1)`,
    ['Admin@gmail.com', DEFAULT_ADMIN_HASH]
  );

  await db.query(
    `INSERT INTO admin_users (email, password_hash, name, role, is_active, created_at, updated_at)
     VALUES
       ($1, $2, $3, 'admin', TRUE, NOW(), NOW()),
       ($4, $2, $3, 'admin', TRUE, NOW(), NOW())
     ON CONFLICT (email) DO UPDATE
     SET password_hash = EXCLUDED.password_hash,
         is_active = TRUE,
         updated_at = NOW()`,
    ['Admin@gmail.com', DEFAULT_ADMIN_HASH, 'DENR Admin', 'admin@admin.com']
  );
}

module.exports = {
  ensureDatabaseSchema,
};
