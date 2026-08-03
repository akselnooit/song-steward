# CLAUDE.md — Song Steward

> Wklej ten plik do **korzenia repozytorium** nowego brancha. Claude Code czyta go automatycznie i traktuje jako stałe instrukcje projektu.

## Co budujemy
Przebudowa aplikacji **Song Steward** — mobilna PWA dla prowadzących uwielbienie. Mobile-first, używana jedną ręką na scenie, często w półmroku. Cała aplikacja za logowaniem (magic-link, tylko na zaproszenie). Jedna wspólna przestrzeń danych dla zespołu. **UI po polsku.**

## Stack (ustalony — trzymaj się go)
- **Vite + React + TypeScript**
- **Tailwind CSS** (tokeny designu jako zmienne CSS — patrz `design_handoff_song_steward/`)
- **Supabase** (PostgreSQL + Auth magic-link + RLS) przez `@supabase/supabase-js`
- **TanStack Query** (cache + optymistyczne UI)
- **react-router-dom** z **`createHashRouter`** (wymóg GitHub Pages)
- **zod** (walidacja wejść)
- Ikony: **lucide-react**
- Hosting: **GitHub Pages** (auto-deploy na push do `main`)

## Źródło designu — ZAWSZE konsultuj
Folder **`design_handoff_song_steward/`** to kompletna specyfikacja designu:
- `README.md` — pełny opis ekranów, wzorców, tokenów, modelu danych, kolejności prac.
- `reference/Song Steward.html` — **żywy prototyp**; otwórz w przeglądarce, by zobaczyć docelowy wygląd i zachowanie.
- `reference/styles.css` — **źródło prawdy dla tokenów** (kolory OKLCH, typografia, promienie, cienie).

Implementuj UI **wiernie** (hi-fi). Zachowuj polskie copy dosłownie. Pliki w `reference/` to referencja — **odtwórz** je w docelowym stacku, nie kopiuj HTML 1:1.

## Zasady, których pilnuj
1. **Kolory źródeł tagów są STAŁE** (niezależne od motywu/akcentu): `confirmed`=niebieski, `user`=bursztynowy, `ai`=fioletowy. Nie zmieniaj.
2. **Oba motywy** (jasny/ciemny) wszędzie. Motyw w `localStorage['ss-theme']` + `data-theme` na root. Element jest widoczny bez animacji — animacja tylko „wprowadza" (działa z `prefers-reduced-motion`).
3. **Tag pill:** tap = include, long-press ~500 ms / prawy przycisk = exclude (ruch >8px anuluje). Jeden wspólny hook.
4. **Filtrowanie po tagach:** AND dla include, NOT dla exclude.
5. **Optymistyczne UI** dla wszystkich mutacji (TanStack Query).
6. **Min. hit target 48px.** Respektuj `env(safe-area-inset-*)`.
7. **Chip lokalizacji:** nieaktywny = ikona, aktywny = chip z nazwą; brak „×"; tap → Ustawienia → Preferencje. Jedno źródło prawdy.
8. **Ciężkie operacje (statystyki, tagi AND/NOT) jako funkcje/widoki SQL** w Supabase — nie licz na telefonie.
9. **Nie ruszaj schematu produkcyjnego** poza migracjami **addytywnymi**. Włącz **RLS** (authenticated = pełny dostęp, anon = brak).
10. **Hash routing** — bez wyjątków (GitHub Pages).

## Czego NIE robić
- Nie odtwarzaj lewego „panelu sterowania" z prototypu — to tylko narzędzie prezentacji.
- Nie używaj danych z `reference/data.js` w produkcji — to przykład kształtu danych.
- Nie dodawaj ról/uprawnień granularnych — model to „zalogowany = wszystko".

## Proces developerski — OBOWIĄZKOWE

### Branching
- **`main`** — domyślna gałąź roboczy **i** produkcyjna (GitHub Pages). Standardowo pracujemy i commitujemy **bezpośrednio na `main`**.
- **`staging`** — używany tylko dla większych zmian o potencjalnie ryzykownym/destrukcyjnym charakterze (np. migracje schematu, duże przebudowy). Użytkownik sam zdecyduje, kiedy chce pracować na `staging` — nie zakładaj tego domyślnie.

### Po każdej zmianie
Po wprowadzeniu zmian **zawsze pushuj od razu** (`git push origin main`), żeby GitHub Actions wykonał build i deploy na produkcję. Użytkownik chce widzieć zmiany na żywym URL bez ręcznego push.

**NIE sprawdzaj, czy GitHub Actions przeszedł i czy deploy wszedł na żywy URL.** Nie odpytuj `gh run`, nie pobieraj produkcyjnego URL-a, nie czekaj w pętli. To działa praktycznie zawsze, tylko trwa — a czekanie blokuje użytkownika. Zgłoś wyłącznie sytuację, w której **sam `git push` się nie udał**. Weryfikację działania na produkcji robi użytkownik.

### Backup bazy — przed każdą migracją
- `npm run backup` → `backups/backup-RRRR-MM-DD-GGMM.sql` (pełny `pg_dump` schematu `public` z danymi). Wymaga uruchomionego **Docker Desktop** oraz `SUPABASE_DB_URL_RO` w `.env.local`.
- Katalog `backups/` jest w `.gitignore` — backupy nie trafiają do repozytorium.
- **Zrób backup przed KAŻDĄ migracją** i powiedz użytkownikowi, w którym pliku wylądował.

### Dostęp do bazy — tylko do czytania
- Claude ma wyłącznie rolę **`backup_ro`** (`SUPABASE_DB_URL_RO`): `SELECT` na wszystkim, zero uprawnień do zapisu. Definicja: `supabase/05_backup_role.sql`.
- Zapytania diagnostyczne uruchamiaj przez tę rolę w kontenerze:
  `docker run --rm --env PGURL postgres:17-alpine psql "$PGURL" -c '…'` (connection string podawaj **zmienną środowiskową**, nigdy w argumentach; nie wypisuj go w logach).
- Po dodaniu nowej tabeli z RLS trzeba **ponownie** uruchomić `05_backup_role.sql` — inaczej backup tej tabeli będzie pusty, bez żadnego błędu.

### Migracje
- Plik `supabase/NN_nazwa.sql`, zmiany **addytywne**, całość w jednej transakcji `BEGIN/COMMIT` — żeby nieudana migracja nie zostawiła bazy w połowie.
- **Migracje uruchamia użytkownik** w Supabase Dashboard → SQL Editor. Claude nie ma prawa zapisu.
- Kod zależny od nowej kolumny **pushuj dopiero PO** potwierdzeniu migracji przez użytkownika — inaczej produkcja wywali się na nieistniejącej kolumnie.
- Na końcu pliku umieszczaj zapytanie kontrolne, którego wynik użytkownik wkleja z powrotem.

### Weryfikacja zmian
Kolejność od najtańszego. Rób to, co ma sens dla danej zmiany, i **zawsze napisz wprost, czego NIE udało się sprawdzić** — nie zgłaszaj „działa", jeśli sprawdziłeś tylko kompilację.
1. `npx tsc -b` i `npm run build` — zawsze przy zmianach w kodzie.
2. Stan bazy — read-only `psql` rolą `backup_ro` (istnienie kolumn, ograniczeń, indeksów, rozkład danych).
3. UI — dev server w panelu Browser. Cała apka jest za magic linkiem, więc bez zalogowanej sesji widać tylko ekran logowania.

**Nigdy nie loguj się na konto użytkownika** i nie proś o kod z maila. Jeśli użytkownik zalogował sesję w panelu podglądu: czytaj i klikaj swobodnie, ale **nie twórz, nie zmieniaj i nie usuwaj danych produkcyjnych** bez wyraźnej zgody w tej rozmowie — to jedna wspólna baza zespołu, nie piaskownica.

## Komendy
- `npm run dev` — serwer deweloperski
- `npm run build` — build produkcyjny
- `npm run preview` — podgląd buildu
- `npm run backup` — backup bazy do `backups/*.sql` (wymaga Dockera)
