# Specyfikacja aplikacji: Song Steward

> Ostatnia aktualizacja: październik 2026 (v2 — Vite + React, logowanie, RLS, godzina nabożeństwa)
>
> Ten plik opisuje **stan faktyczny** aplikacji. Zasady pracy i stack: `CLAUDE.md`. Docelowy design: `design_handoff_song_steward/`. Pomysły na przyszłość: `TODO.md`.

## 1. Cel i kontekst

**Song Steward** to aplikacja webowa (PWA) dla osób prowadzących pieśni w ewangelicznym kościele. Umożliwia zarządzanie bazą pieśni, planowanie i rejestrowanie pieśni na nabożeństwach oraz szybkie wyszukiwanie pieśni po tagach — także w trakcie nabożeństwa, na telefonie, jedną ręką.

Nazwa nawiązuje do biblijnej koncepcji *stewardship* — odpowiedzialnego zarządzania tym, co zostało powierzone. Lider muzyczny jest stewardem repertuaru pieśni zboru.

**Użytkownicy:** kilku liderów (m.in. Aksel, Edwin, Ruben, Torstein). Wszyscy pracują na jednej wspólnej bazie. Dostęp tylko po zalogowaniu, konta zakłada administrator (patrz §10).

---

## 2. Stack technologiczny

| Warstwa | Technologia |
|---|---|
| Frontend | Vite + React 19 + TypeScript |
| Routing | react-router-dom (`createHashRouter`) |
| Styl | Tailwind CSS v4 + tokeny designu jako zmienne CSS (motyw jasny/ciemny) |
| Cache / zapytania | TanStack Query (optymistyczne UI dla mutacji) |
| Walidacja | zod (`src/lib/schemas.ts`) |
| Baza danych | Supabase (PostgreSQL + Auth + RLS) |
| Hosting | GitHub Pages (auto-deploy z `main` przez GitHub Actions) |
| Ikony | Lucide React |
| Drag & drop | @dnd-kit |

**Zasady architektury:**
- Prosta, płaska struktura folderów, minimalna liczba zależności
- Każdy plik ma jeden, jasny cel
- Hash routing (wymóg GitHub Pages — bez wyjątków)
- Ciężkie obliczenia (statystyki, filtrowanie AND/NOT) docelowo jako funkcje SQL w Supabase

---

## 3. Schemat bazy danych (Supabase / PostgreSQL)

Pliki w `supabase/`:

| Plik | Zawartość |
|---|---|
| `00_init.sql` | Bazowy schemat tabel (tylko DDL, bez danych słownikowych) |
| `02_auth.sql` | Kolumny `auth_user_id`, `email` w `worship_leaders` + włączenie RLS i polityk |
| `03_rpc.sql` | Funkcje statystyk `get_top_sung`, `get_never_sung` |
| `04_service_time.sql` | Kolumna `services.start_time` + ograniczenia |
| `05_backup_role.sql` | Rola tylko do odczytu `backup_ro` (backupy, diagnostyka) |

> Uwaga: `00_init.sql` **nie zawiera** zmian z `02` i `04`. Odtwarzając bazę od zera, uruchom pliki po kolei.

### `collections` — Zbiory pieśni
```sql
id UUID PK, name TEXT NOT NULL, short_name TEXT NOT NULL, created_at TIMESTAMPTZ
```

### `songs` — Pieśni
```sql
id UUID PK,
collection_id UUID → collections ON DELETE CASCADE,
number INTEGER NOT NULL,
title TEXT NOT NULL,
author TEXT,
author_image TEXT,        -- URL zdjęcia autora (SongTreasures)
author_id TEXT,           -- ID autora z SongTreasures
original_key TEXT,        -- tonacja, np. "G", "Am"
minor BOOLEAN,            -- true = mol, false = dur
created_at TIMESTAMPTZ,
UNIQUE (collection_id, number)
```

### `tag_categories` — Kategorie tagów
```sql
id UUID PK, name TEXT NOT NULL UNIQUE,
user_editable BOOLEAN NOT NULL DEFAULT true,  -- false = tagi tylko do odczytu
created_at TIMESTAMPTZ
```
`user_editable = false` ma tylko kategoria **Tagi SSF**.

### `tags` — Tagi
```sql
id UUID PK, category_id UUID → tag_categories ON DELETE SET NULL,
name TEXT NOT NULL UNIQUE, description TEXT, created_at TIMESTAMPTZ
```

### `song_tags` — Przypisanie tagów do pieśni
```sql
song_id UUID → songs ON DELETE CASCADE,
tag_id  UUID → tags  ON DELETE CASCADE,
source TEXT NOT NULL DEFAULT 'confirmed' CHECK (source IN ('confirmed','user','ai')),
pending_removal BOOLEAN NOT NULL DEFAULT false,
PRIMARY KEY (song_id, tag_id)
```
- `confirmed` — zatwierdzone (niebieskie)
- `user` — dodane w aplikacji, czeka na moderację (bursztynowe)
- `ai` — przypisane przez AI (fioletowe); aplikacja tylko je wyświetla, nic ich dziś nie tworzy
- `pending_removal = true` — ktoś zgłosił usunięcie zatwierdzonego tagu, czeka na moderację

### `locations`, `service_categories` — Słowniki
```sql
id UUID PK, name TEXT NOT NULL UNIQUE, created_at TIMESTAMPTZ
```

### `worship_leaders` — Prowadzący muzykę
```sql
id UUID PK, name TEXT NOT NULL,
auth_user_id UUID → auth.users,   -- opcjonalne, aplikacja z niego nie korzysta
email TEXT,                       -- po nim aplikacja łączy zalogowanego użytkownika z prowadzącym
created_at TIMESTAMPTZ
```
Prowadzący bez emaila to „Gość — brak konta" (można go wybrać na nabożeństwie, ale nie loguje się).

### `services` — Nabożeństwa
```sql
id UUID PK,
location_id UUID NOT NULL → locations ON DELETE RESTRICT,
category_id UUID NOT NULL → service_categories ON DELETE RESTRICT,
worship_leader_id UUID → worship_leaders ON DELETE SET NULL,
date DATE NOT NULL,
start_time TIME NOT NULL,   -- zawsze pełny kwadrans (CHECK services_start_time_quarter)
notes TEXT,
created_at TIMESTAMPTZ
```
Unikalny indeks `services_unique_slot (date, start_time, location_id)` — dwa nabożeństwa w tym samym miejscu i czasie są niemożliwe.

### `service_songs` — Pieśni na nabożeństwie
```sql
id UUID PK,
service_id UUID → services ON DELETE CASCADE,
song_id    UUID → songs    ON DELETE CASCADE,
status TEXT NOT NULL CHECK (status IN ('planned','sung')),
song_order INTEGER,
added_at TIMESTAMPTZ
```

### Funkcje RPC (`03_rpc.sql`)
- `get_top_sung(p_location_id, p_leader_id, p_months, p_tag_ids_include, p_tag_ids_exclude, p_limit)` — najczęściej śpiewane; tagi include = AND, exclude = NOT. Używana na pulpicie (tylko z `p_location_id`).
- `get_never_sung(...)` — te same parametry; obecnie **nieużywana** przez aplikację.

---

## 4. Struktura projektu

```
song-steward/
├── src/
│   ├── main.tsx              # Start: motyw, przekierowanie błędów auth, baner STAGING, UpdateBanner
│   ├── router.tsx            # createHashRouter + ProtectedRoute
│   ├── index.css             # Tokeny designu (OKLCH), motywy, style bazowe
│   ├── screens/              # Dashboard, Songs, Services, Live, Settings, Moderation, Login
│   ├── components/           # Layout, TabBar, SongOverlay, NewServiceSheet, NotesEditor,
│   │   │                     # UpdateBanner, SyncIndicator, PremiumThanks, ProtectedRoute…
│   │   └── ui/               # TagPill, SongCard, Sheet, LocationChip, TimePicker, Scrubber…
│   ├── contexts/             # SongOverlayContext (globalny podgląd pieśni)
│   ├── hooks/                # useLongPress, useLocationFilter, useTheme, useWakeLock,
│   │                         # useNotesAutosave, useVersionCheck, useCurrentUser…
│   └── lib/
│       ├── supabase.ts       # Klient Supabase
│       ├── types.ts          # Typy TypeScript (tabele + RPC)
│       ├── schemas.ts        # Schematy zod
│       └── queries/          # Zapytania i mutacje TanStack Query
├── supabase/                 # Schemat i migracje SQL (patrz §3)
├── scripts/
│   ├── backup.mjs            # npm run backup
│   └── generate-icons.js     # Ikony PWA
├── design_handoff_song_steward/  # Specyfikacja designu + prototyp
├── public/                   # Ikony, manifest PWA
├── .github/workflows/        # deploy.yml (main), deploy-staging.yml (staging)
├── backups/                  # Backupy bazy (gitignore)
└── data/                     # Surowe dane i skrypty importu SongTreasures (gitignore)
```

---

## 5. Funkcjonalności

### 5.0 Nawigacja i elementy wspólne

- Trasy: `/login` (publiczna); za logowaniem: `/` (Pulpit), `/songs`, `/services`, `/live/:id`, `/settings`, `/moderation`. Stara trasa `/search` przekierowuje na `/songs`.
- Dolny pasek zakładek: **Pulpit**, **Pieśni**, **Nabożeństwa**. Ekrany Live, Ustawienia i Moderacja są bez paska.
- **Globalny filtr lokalizacji** (`localStorage['ss_location_id']`) — jedno źródło prawdy dla całej aplikacji, synchronizowane między kartami. Chip lokalizacji: bez filtra = ikona pinezki, z filtrem = chip z nazwą; tap → Ustawienia → Preferencje.
- **SongOverlay** — globalny arkusz z podglądem pieśni, otwierany z każdej listy (nigdy osobna strona `/songs/:id`); patrz §5.6.
- **SyncIndicator** — cienki pasek „zapisywanie" (po 400 ms trwania mutacji) i pigułka „Nie zapisano" przy błędzie.
- **Tag pill** — tap = dołącz, przytrzymanie ~500 ms lub prawy przycisk = wyklucz; ruch >8 px anuluje.

### 5.1 Pulpit (`/`)

- Powitanie „Dzień dobry" + imię zalogowanego prowadzącego, chip lokalizacji, ikona ustawień.
- **Nadchodzące nabożeństwa** (od dziś): jedno = karta, kilka = karuzela. Karta pokazuje „DZIŚ", datę i godzinę, kategorię, lokalizację, prowadzącego i licznik „X zaśpiewanych / Y zaplanowanych”. „Otwórz” prowadzi do Live.
- **Baner moderacji** „Moderacja tagów · N oczekujących zmian”, gdy jest coś do zatwierdzenia.
- Przycisk **„Nowe nabożeństwo”** (arkusz NewServiceSheet).
- **„Ostatnio odbyte”** — poziomy pasek do 10 ostatnich nabożeństw + kafelek „Więcej” (→ `/services`).
- **„Najczęściej śpiewane”** — top 5 z RPC `get_top_sung`, zawężone tylko globalną lokalizacją.

### 5.2 Pieśni (`/songs`)

- Wyszukiwarka „Szukaj: tytuł, autor, numer lub tag” (fragment tytułu, autora lub numeru).
- **Sortowanie:** „Numer” (kolejność zbiorów DP → KM → pozostałe), „Dawno” (najpierw nigdy nieśpiewane, potem najdawniej śpiewane), „Często” (liczba zaśpiewań malejąco). W trybach statystyk zamiast autora i tonacji widać `N×`, „nigdy” albo względny czas. Statystyki uwzględniają globalną lokalizację i są **liczone na telefonie** (z `service_songs` + `services`).
- **„Zawęź”** — do 12 podpowiedzi tagów: bez wpisanego tekstu najczęstsze tagi wśród wyników; z tekstem tagi pasujące nazwą. Wybór tagu kasuje wpisany tekst, jeśli był częścią nazwy tagu.
- **Arkusz „Filtry”**: zbiory oraz tagi pogrupowane w kategorie (akordeon, kłódka przy kategoriach tylko do odczytu). Tagi include = **AND**, exclude = **NOT**.
- Aktywne filtry jako pigułki + „Wyczyść wszystko”. Zapamiętywane w `localStorage`: `ss-songs-cols`, `ss-songs-inc`, `ss-songs-exc`, `ss-songs-sort`.
- Do filtrowania liczą się tagi bez `pending_removal` (także jeszcze niezatwierdzone tagi `user`).
- **Scrubber** — szybkie przewijanie przy prawej krawędzi (tryb „Numer”, powyżej 40 wyników).
- Pieśni z dzisiejszego nabożeństwa są oznaczone jako zaplanowane lub zaśpiewane.

### 5.3 Nabożeństwa (`/services`)

- Lista wszystkich nabożeństw w globalnej lokalizacji, od najnowszych (data + godzina).
- Usuwanie: pierwszy tap na kosz uzbraja (3 s, „Kliknij kosz jeszcze raz, aby usunąć”), drugi usuwa.
- „+” otwiera NewServiceSheet. Pozycja przewinięcia jest pamiętana w obrębie sesji.

**NewServiceSheet / edycja nabożeństwa:** data (domyślnie dziś), **godzina — obowiązkowa, bez wartości domyślnej** (szybkie kafelki 11:00, 12:00, 19:00, 20:00 lub „Inna…” z wyborem co kwadrans), lokalizacja (domyślnie globalna), kategoria (posortowana wg użycia), „Prowadzący muzykę (opcjonalnie)” (domyślnie zalogowany). Ta sama data + lokalizacja + godzina blokuje zapis.

### 5.4 Prowadzenie nabożeństwa (`/live/:id`)

- Ekran nie gaśnie (Wake Lock). Strzałki lub swipe w poziomie przełączają między nabożeństwami, jeśli weszliśmy z listy.
- Ołówek → edycja nabożeństwa (te same pola co przy tworzeniu).
- **Notatki** — tap otwiera pełnoekranowy edytor. Autozapis (po 2,5 s bez pisania, najrzadziej co 10 s w trakcie, ponawianie, zapis przy zamknięciu/ukryciu aplikacji). Szkic trzymany lokalnie w `ss-notes-draft:<id>` i przywracany, jeśli nie trafił do bazy.
- **„Dodaj pieśń: tytuł lub numer”** — 4 najlepsze wyniki; zakładka = zaplanuj, ✓ = zaśpiewana, tap = SongOverlay.
- **„Zaplanowane”** — przeciąganie (przytrzymanie 400 ms na dotyku), ✓ przenosi do zaśpiewanych, ✗ usuwa.
- **„Zaśpiewane”** — najnowsze na górze, z możliwością przeciągania.
- Oznaczenie zaplanowanej pieśni jako zaśpiewanej **zmienia status** tego samego wiersza (bez duplikatu). Ponowne oznaczenie zaśpiewanej pyta „Dodaj mimo to”.

### 5.5 Moderacja tagów (`/moderation`)

- Kolejka: `song_tags` z `source = 'user'` lub `pending_removal = true`, pogrupowana po pieśniach.
- Dodanie: ✓ → `source = 'confirmed'`, ✗ → usunięcie wiersza.
- Usunięcie: ✓ → usunięcie wiersza, ↺ „Przywróć” → `pending_removal = false`.
- „Zatwierdź wszystko (N)”. Dostęp ma każdy zalogowany.

### 5.6 SongOverlay

- Zdjęcie autora (tap = pełny ekran), zbiór, numer, tytuł, autor, tonacja.
- Nawigacja ←/→ po liście, z której otwarto pieśń; zamknięcie: Esc, tło, przeciągnięcie w dół.
- Karta nabożeństwa („Najbliższe nabożeństwo” / „Nabożeństwo”) z przyciskami „Zaplanuj” i „Zaśpiewana”; przy kilku nadchodzących — „Wybierz nabożeństwo”.
- **„Edytuj tagi”**: dodanie tworzy tag `source = 'user'`; usunięcie tagu `user` kasuje go od razu; usunięcie tagu `confirmed`/`ai` tylko zgłasza `pending_removal` (przekreślony, do moderacji). Kategorie tylko do odczytu trzęsą się przy tapnięciu.
- **„Otwórz w Song Treasures”** — link `https://songtreasures.app/songs/<zbiór>/<numer>`.
- **„Historia śpiewania”** — do 20 ostatnich zaśpiewań (w globalnej lokalizacji); tap otwiera to nabożeństwo.
- Ekran nie gaśnie, gdy overlay jest otwarty.

### 5.7 Ustawienia (`/settings`)

**Zakładka „Zarządzanie”:**
- Baner „Song Steward Premium” — makieta oferty (bez płatności), po kliknięciu podziękowanie i mini-gra „Echo melodii” (rekord w `ss-echo-best`).
- Wejście do „Panelu moderacji” z licznikiem.
- **„Słowniki danych”** — dodawanie, zmiana nazwy i usuwanie: lokalizacje, kategorie nabożeństw, prowadzący muzykę, tagi. Zbiory pieśni i kategorie tagów tylko do odczytu.
- „Wyloguj się”.

**Zakładka „Preferencje”:**
- „Wygląd” — Jasny / Ciemny (`localStorage['ss-theme']`, domyślnie ciemny).
- „Globalny filtr lokalizacji” — Wszystkie lub jedna lokalizacja.
- „Wersja aplikacji” — na sztywno `v2.0` (niezwiązana z wykrywaniem aktualizacji).

### 5.8 Logowanie (`/login`)

- Tylko na zaproszenie: `signInWithOtp` z `shouldCreateUser: false`. Nieznany adres → „Ten adres nie jest na liście zaproszonych…”.
- Główna ścieżka to **8-cyfrowy kod z emaila** wpisywany w aplikacji (link z maila otwiera się w przeglądarce, nie w zainstalowanej PWA). Skróty do Gmaila/Outlooka.
- Zalogowany użytkownik jest łączony z prowadzącym po `worship_leaders.email`.

---

## 6. Mobile / PWA

- Instalacja na iOS: Safari → Udostępnij → Dodaj do ekranu głównego
- `viewport-fit=cover` + `env(safe-area-inset-*)`, minimalny cel dotyku 48 px
- `touch-action: manipulation`, brak podświetlenia tapnięcia
- Motyw jasny i ciemny wszędzie; animacje tylko „wprowadzają” element (z `prefers-reduced-motion`)
- **Wake Lock** — na ekranie Live i przy otwartym SongOverlay
- **Wykrywanie nowej wersji** (bez service workera): build zapisuje `version.json` z `buildId`; aplikacja sprawdza go przy starcie i powrocie do aplikacji i pokazuje baner „Dostępna nowa wersja” z przyciskiem „Odśwież”

---

## 7. Konfiguracja środowiska

### `.env.local` (lokalny, nigdy nie commitować)
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_DB_URL_RO=...      # tylko do backupu/diagnostyki, rola backup_ro
```

### GitHub Actions
Sekrety repozytorium: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. `VITE_BASE` ustawia workflow (`/song-steward/` lub `/song-steward/staging/`).

---

## 8. Import danych

Dane pieśni z SongTreasures. Pliki surowe i skrypty w `data/` (gitignore).

| Skrót | Nazwa | Liczba pieśni |
|-------|-------|--------------|
| DP  | Drogi Pańskie             | ~471 |
| KM  | Kwiat Migdałowy           | ~445 |
| SOS | Sing Our Songs            | ~52  |
| NKM | Kwiat Migdałowy - dodatek | ~10  |
| NDP | Drogi Pańskie - dodatek   | ~6   |

**Łącznie: 984 pieśni** (stan: maj 2026)

```bash
node data/import-songs.mjs    # kolekcje i pieśni
node data/import-authors.mjs  # autorzy i zdjęcia
node data/import-keys.mjs     # tonacje (original_key, minor)
```

---

## 9. Backup, migracje i deployment

**Backup:** `npm run backup` → `backups/backup-RRRR-MM-DD-GGMM.sql` (pełny `pg_dump` schematu `public` z danymi). Wymaga Docker Desktop i `SUPABASE_DB_URL_RO`. Robiony przed każdą migracją.

**Migracje:** pliki `supabase/NN_nazwa.sql`, tylko addytywne, w jednej transakcji, uruchamiane ręcznie w Supabase Dashboard → SQL Editor. Po dodaniu tabeli z RLS trzeba ponownie uruchomić `05_backup_role.sql`.

**Deployment:**
```
git push origin main     →  GitHub Actions  →  gh-pages (root)       →  /song-steward/
git push origin staging  →  GitHub Actions  →  gh-pages/staging/     →  /song-steward/staging/
```
Wersja staging pokazuje pasek „STAGING”. Szczegóły procesu: `CLAUDE.md`.

---

## 10. Bezpieczeństwo

- Cała aplikacja za logowaniem (Supabase Auth, email OTP, tylko zaproszeni — konta zakłada administrator w Supabase).
- **RLS włączone** na wszystkich tabelach: `authenticated` = pełny dostęp, `anon` = brak.
- Brak ról — każdy zalogowany może wszystko (także moderację i słowniki).
- Klucz anon jest publiczny (trafia do bundla) — dane chroni RLS.
- Rola `backup_ro` ma wyłącznie odczyt (`pg_read_all_data`, transakcje read-only).

---

## 11. Przyszłe funkcje

Pełna lista pomysłów: **`TODO.md`**.
