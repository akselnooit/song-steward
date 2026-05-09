-- Dodaje kolumny tonacji do tabeli songs
-- Uruchom w Supabase Dashboard → SQL Editor

ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS original_key text,
  ADD COLUMN IF NOT EXISTS minor boolean;
