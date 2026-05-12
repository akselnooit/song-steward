-- Dodaje kolumnę pending_removal do song_tags
-- Gdy użytkownik odpina tag, nie jest on usuwany od razu — tylko oznaczany.
-- Administrator zatwierdza usunięcie lub przywraca tag.

ALTER TABLE song_tags
  ADD COLUMN pending_removal boolean NOT NULL DEFAULT false;
