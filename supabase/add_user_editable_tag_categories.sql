-- Add user_editable flag to tag_categories
-- user_editable = false means tags in this category cannot be added/removed via the UI

ALTER TABLE tag_categories
  ADD COLUMN user_editable boolean NOT NULL DEFAULT true;

-- Lock "Tagi SSF" category
UPDATE tag_categories
  SET user_editable = false
  WHERE id = '611b904a-f262-4a25-9f6e-f4d64552cf62';
