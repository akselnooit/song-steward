-- Run after running scripts/migrate_service_types.mjs
ALTER TABLE services ALTER COLUMN location_id SET NOT NULL;
ALTER TABLE services ALTER COLUMN category_id SET NOT NULL;
ALTER TABLE services DROP COLUMN IF EXISTS service_type_id;
DROP TABLE IF EXISTS service_types;
