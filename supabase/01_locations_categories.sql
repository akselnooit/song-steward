-- Step 1: Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create service_categories table
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Seed locations
INSERT INTO locations (name) VALUES ('Wrocław'), ('Ustroń'), ('Brunstad'), ('Ukraina')
ON CONFLICT (name) DO NOTHING;

-- Step 4: Seed categories
INSERT INTO service_categories (name) VALUES ('Ogólne'), ('Środowe'), ('Młodzieżowe')
ON CONFLICT (name) DO NOTHING;

-- Step 5: Add new columns to services (nullable first for migration)
ALTER TABLE services ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
ALTER TABLE services ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL;
