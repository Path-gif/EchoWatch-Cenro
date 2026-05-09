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
