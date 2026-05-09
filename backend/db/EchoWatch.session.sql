CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon_emoji VARCHAR(10),
    color_code VARCHAR(7),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categories (name, description, icon_emoji, color_code) VALUES
    ('Illegal Cutting', 'Unauthorized logging and tree cutting activities', 'Tree', '#10B981'),
    ('Illegal Occupation', 'Illegal settlement and land occupation', 'Home', '#F59E0B'),
    ('Wildlife Poaching', 'Illegal hunting and animal trafficking', 'Wildlife', '#8B5CF6'),
    ('Mining Violation', 'Illegal or improper mining activities', 'Mining', '#EF4444')
ON CONFLICT (name) DO NOTHING;
