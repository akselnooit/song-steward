-- ============================================================
-- Song Steward — rola TYLKO DO CZYTANIA dla backupów
-- Uruchom ręcznie w Supabase Dashboard → SQL Editor.
-- Plik jest IDEMPOTENTNY — można go uruchamiać wielokrotnie
-- (i NALEŻY po dodaniu nowej tabeli z RLS).
--
-- PRZED URUCHOMIENIEM: podmień <WKLEJ_TU_DLUGIE_HASLO> w linii CREATE ROLE
-- na własne, długie, losowe hasło. Nie da się go później odczytać z bazy —
-- zapisz je w menedżerze haseł.
-- ============================================================

-- 1. Rola logowania bez żadnych przywilejów administracyjnych.
--    NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOREPLICATION/NOBYPASSRLS.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'backup_ro') THEN
    CREATE ROLE backup_ro WITH LOGIN PASSWORD '<WKLEJ_TU_DLUGIE_HASLO>'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
      CONNECTION LIMIT 3;
  END IF;
END $$;

-- 2. Prawo SELECT na WSZYSTKIM (także na tabelach dodanych w przyszłości).
--    `pg_read_all_data` to wbudowana rola Postgresa ≥14 i daje WYŁĄCZNIE
--    czytanie — żadnego INSERT/UPDATE/DELETE ani DDL. To jest twarda granica:
--    rola nie ma skąd wziąć uprawnień do zapisu, bo nie należy do `authenticated`
--    ani do żadnej innej roli aplikacyjnej.
GRANT pg_read_all_data TO backup_ro;

-- 3. Pas i szelki: każda transakcja tej roli startuje jako read-only, więc
--    nawet omyłkowe `UPDATE` przerwie się na poziomie transakcji, a nie dopiero
--    na braku uprawnień.
ALTER ROLE backup_ro SET default_transaction_read_only = on;

-- 4. RLS: prawo SELECT nie wystarcza, gdy na tabeli włączony jest RLS. Polityki
--    z `02_auth.sql` są wystawione TYLKO dla roli `authenticated`, więc bez
--    własnej polityki `backup_ro` zobaczyłby zero wierszy (i backup byłby pusty,
--    NIE zgłaszając błędu!). Dodajemy politykę wyłącznie FOR SELECT — to nie
--    otwiera drogi do zapisu, bo rola i tak nie ma na to uprawnień tabelowych.
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "backup_ro_read" ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY "backup_ro_read" ON public.%I FOR SELECT TO backup_ro USING (true)',
      tbl
    );
  END LOOP;
END $$;

-- 5. Kontrola: pokaż, co rola faktycznie może. Oczekiwany wynik —
--    can_write = false dla KAŻDEJ tabeli.
SELECT
  c.relname AS tabela,
  has_table_privilege('backup_ro', c.oid, 'SELECT') AS can_read,
  has_table_privilege('backup_ro', c.oid, 'INSERT')
    OR has_table_privilege('backup_ro', c.oid, 'UPDATE')
    OR has_table_privilege('backup_ro', c.oid, 'DELETE') AS can_write,
  EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = c.relname
      AND p.policyname = 'backup_ro_read'
  ) AS ma_polityke_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;

-- ------------------------------------------------------------
-- Zmiana hasła w przyszłości:
--   ALTER ROLE backup_ro WITH PASSWORD 'nowe-haslo';
-- Odebranie dostępu całkowicie:
--   REVOKE pg_read_all_data FROM backup_ro;
--   DROP ROLE backup_ro;   -- (najpierw usuń polityki "backup_ro_read")
-- ------------------------------------------------------------
