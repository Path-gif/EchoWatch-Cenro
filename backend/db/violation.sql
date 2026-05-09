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

INSERT INTO categories (name, description, icon_emoji, color_code) VALUES
    ('Illegal Cutting', 'Unauthorized logging and tree cutting activities', 'Tree', '#10B981'),
    ('Illegal Occupation', 'Illegal settlement and land occupation', 'Home', '#F59E0B'),
    ('Pollution', 'Air, water, or soil pollution incidents', 'Water', '#3B82F6'),
    ('Wildlife Poaching', 'Illegal hunting and animal trafficking', 'Wildlife', '#8B5CF6'),
    ('Mining Violation', 'Illegal or improper mining activities', 'Mining', '#EF4444'),
    ('Waste Dumping', 'Illegal waste disposal and littering', 'Waste', '#6B7280')
ON CONFLICT (name) DO NOTHING;
