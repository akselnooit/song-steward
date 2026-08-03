-- ============================================================
-- Song Steward — godzina rozpoczęcia nabożeństwa (migracja addytywna)
-- Uruchom ręcznie w Supabase Dashboard → SQL Editor, CAŁY plik naraz.
-- Wymaga backupu — patrz `npm run backup`.
--
-- Kolumna nazywa się `start_time`, nie `time`: `time` jest nazwą typu w SQL,
-- co w każdym ręcznym zapytaniu wymagałoby cudzysłowów.
-- ============================================================

BEGIN;

-- 1. Nowa kolumna. Na razie NULL-owalna, bo istniejące wiersze muszą najpierw
--    dostać wartość (NOT NULL dokładamy w kroku 4).
ALTER TABLE services ADD COLUMN IF NOT EXISTS start_time TIME;

-- 2. Backfill heurystyką: „Ogólne" w niedzielę to nabożeństwo przedpołudniowe,
--    wszystko pozostałe (Środowe, Młodzieżowe, Braterskie, konferencyjne piątki
--    i soboty) — wieczorne. Dla 81 z 93 nabożeństw godzina nie rozstrzyga
--    niczego, bo w danym dniu i lokalizacji jest tylko jedno; nieścisłość jest
--    tam bez konsekwencji, a użytkownik może ją poprawić w apce.
UPDATE services s
SET start_time = CASE
      WHEN EXTRACT(DOW FROM s.date) = 0 AND TRIM(c.name) ILIKE 'Ogólne%' THEN TIME '11:00'
      ELSE TIME '19:00'
    END
FROM service_categories c
WHERE c.id = s.category_id
  AND s.start_time IS NULL;

-- 3. Rozdzielenie kolizji. 12 dni ma po dwa nabożeństwa w tej samej lokalizacji
--    (w 7 przypadkach nawet w tej samej kategorii) — po kroku 2 dostałyby
--    identyczną godzinę i pozostałyby nierozróżnialne, a dodatkowo zablokowałyby
--    unikalny indeks z kroku 5. Wcześniej dodane (po `created_at`) dostaje
--    godzinę przedpołudniową, kolejne — wieczorne.
WITH grp AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY date, location_id ORDER BY created_at, id) AS rn,
    COUNT(*)     OVER (PARTITION BY date, location_id)                        AS cnt
  FROM services
)
UPDATE services s
SET start_time = (ARRAY[TIME '11:00', TIME '19:00', TIME '17:00', TIME '21:00'])[LEAST(g.rn, 4)]
FROM grp g
WHERE g.id = s.id
  AND g.cnt > 1;

-- 4. Godzina jest obowiązkowa. Bez DEFAULT — apka ma wymuszać świadomy wybór,
--    a domyślna wartość w bazie po cichu ratowałaby błędny zapis.
ALTER TABLE services ALTER COLUMN start_time SET NOT NULL;

ALTER TABLE services DROP CONSTRAINT IF EXISTS services_start_time_quarter;
ALTER TABLE services ADD CONSTRAINT services_start_time_quarter CHECK (
  EXTRACT(MINUTE FROM start_time) IN (0, 15, 30, 45)
  AND EXTRACT(SECOND FROM start_time) = 0
);

-- 5. Dwa nabożeństwa w tej samej lokalizacji o tej samej godzinie tego samego
--    dnia to fizyczna niemożliwość, więc blokujemy je w BAZIE, nie tylko w UI.
--    Gdyby ten indeks nie powstał (bo w danych zostały duplikaty), cała migracja
--    wycofa się razem z transakcją — zobaczysz błąd i nic nie zmieni się połowicznie.
DROP INDEX IF EXISTS services_unique_slot;
CREATE UNIQUE INDEX services_unique_slot ON services (date, start_time, location_id);

COMMIT;

-- 6. Kontrola: rozkład godzin po backfillu.
SELECT start_time, COUNT(*) AS ile
FROM services
GROUP BY start_time
ORDER BY start_time;
