-- Dodaje kolumnę "source" do tabeli song_tags
-- Wartości: 'confirmed' (oryginalne), 'user' (dodane w apce), 'ai' (przyszłość)
-- Uruchom w Supabase Dashboard → SQL Editor

ALTER TABLE song_tags
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'confirmed'
  CHECK (source IN ('confirmed', 'user', 'ai'));

-- Wszystkie istniejące przypisania oznaczamy jako potwierdzone
UPDATE song_tags SET source = 'confirmed' WHERE source IS NULL OR source = '';
