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
- **`staging`** — branch roboczy. Cały development odbywa się tutaj.
- **`main`** — produkcja (GitHub Pages). **Nigdy nie commituj ani nie merguj do `main` bez jawnej zgody użytkownika.**
- Nie tworzymy feature branchy — wszystko idzie prosto na `staging`.

### Po każdej zmianie
Po wprowadzeniu zmian na `staging` **zawsze pushuj od razu** (`git push origin staging`), żeby GitHub Actions wykonał build i deploy na środowisko stagingowe. Użytkownik chce widzieć zmiany na żywym URL bez ręcznego push.

### Merge do produkcji
Merge `staging → main` tylko wtedy, gdy użytkownik **wyraźnie** o to poprosi (np. „wypuść na produkcję", „merguj do maina"). Żadna inna sytuacja nie upoważnia do merge na `main`.

## Komendy
- `npm run dev` — serwer deweloperski
- `npm run build` — build produkcyjny
- `npm run preview` — podgląd buildu
