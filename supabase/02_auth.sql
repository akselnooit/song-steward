-- ============================================================
-- Song Steward — migracja auth (PR 3)
-- Uruchom ręcznie w Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Powiązanie prowadzących z kontami Supabase Auth
ALTER TABLE worship_leaders
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Włącz RLS na wszystkich tabelach
ALTER TABLE songs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags               ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_tags          ENABLE ROW LEVEL SECURITY;
ALTER TABLE worship_leaders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services           ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_songs      ENABLE ROW LEVEL SECURITY;

-- 3. Polityki: zalogowany = pełny dostęp, anonimowy = brak
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'songs','collections','tag_categories','tags','song_tags',
    'worship_leaders','locations','service_categories','services','service_songs'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth_full_access" ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY "auth_full_access" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      tbl
    );
  END LOOP;
END $$;

-- 4. (Opcjonalne) Powiąż istniejących prowadzących z kontami po emailu.
--    Uruchom po tym, jak zaproszysz użytkowników przez Supabase Auth.
-- UPDATE worship_leaders wl
-- SET auth_user_id = au.id
-- FROM auth.users au
-- WHERE wl.email = au.email AND wl.auth_user_id IS NULL;
