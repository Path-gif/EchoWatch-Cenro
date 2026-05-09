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
