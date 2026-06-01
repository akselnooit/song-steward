# Handoff: Song Steward — przebudowa (redesign)

> Pakiet przekazania dla developera. Implementacja w **Claude Code**.
> Docelowy stack: **Vite + React + TypeScript + Tailwind CSS + Supabase** (hosting: **GitHub Pages** przez GitHub Actions, **hash routing**).

---

## 1. Czym są pliki w tym pakiecie

Pliki w folderze `reference/` to **prototyp w HTML/React (przez Babel w przeglądarce)** — **referencja designu**, a NIE kod produkcyjny do skopiowania 1:1. Pokazują docelowy wygląd, układ, interakcje i copy (po polsku).

**Zadanie:** odtworzyć ten design w docelowym środowisku (**Vite + React + TS + Tailwind**) — czysto, z prawdziwą warstwą danych (Supabase), z podziałem na komponenty i z TypeScriptem. Prototyp jest „żywą specyfikacją wizualną" — otwórz `reference/Song Steward.html` w przeglądarce, żeby zobaczyć i przeklikać wszystkie ekrany.

> **Uwaga o panelu po lewej:** w prototypie po lewej stronie jest ciemny „panel sterowania" (przełącznik motywu, skoki do ekranów). To **wyłącznie narzędzie prezentacji prototypu** — NIE jest częścią aplikacji i nie należy go odtwarzać. Prawdziwa aplikacja to tylko zawartość ekranu telefonu.

## 2. Fidelity: **High-fidelity (hi-fi)**

To pixel-perfect makieta — finalne kolory, typografia, odstępy, promienie, interakcje. Odtwórz UI wiernie, używając Tailwinda + tokenów z sekcji 8. Zachowaj polskie copy dosłownie.

---

## 3. Kontekst produktu

**Song Steward** to mobilna aplikacja (PWA) dla prowadzących uwielbienie w zborze. Używana **jedną ręką, na scenie, często w półmroku**. Kluczowe cechy:
- **Mobile-first**, online-only (bez trybu offline w tym zakresie).
- **Logowanie magic-link, tylko na zaproszenie** — cała aplikacja za bramką auth. Model dostępu: „zalogowany = pełny dostęp do wszystkiego, niezalogowany = nic".
- Jedna **wspólna przestrzeń** danych dla całego zespołu (brak ról/uprawnień granularnych).
- Język UI: **polski** (całe copy w prototypie jest finalne).

Pełna specyfikacja biznesowa: patrz oryginalny dokument `song-steward-rebuild-spec.md` (u klienta). Ten README skupia się na **designie i jego odwzorowaniu**.

---

## 4. Architektura nawigacji

Aplikacja po zalogowaniu ma **dolny pasek nawigacji (tab bar)** z 4 zakładkami:

1. **Pulpit** (`dash`) — ekran startowy
2. **Pieśni** (`songs`) — biblioteka pieśni
3. **Szukaj** (`search`) — wyszukiwanie po tagach
4. **Nabożeństwa** (`services`) — lista nabożeństw

Ekrany **bez** tab baru (pełnoekranowe, z przyciskiem „wstecz"):
- **Logowanie** (przed auth)
- **Na żywo** (`live`) — otwarte z Pulpitu lub z listy nabożeństw
- **Ustawienia** (`settings`) — otwarte ikoną koła zębatego z Pulpitu
- **Panel moderacji** (`moderation`) — otwarty z Ustawień lub z banera na Pulpicie

**Routing:** użyj **hash routingu** (`#/dash`, `#/songs`, …) — wymóg GitHub Pages (patrz sekcja 11). Sugerowana biblioteka: `react-router-dom` z `createHashRouter`.

---

## 5. Ekrany — szczegóły

> Wszystkie wymiary i kolory: patrz `reference/styles.css` (źródło prawdy) + sekcja 8. Poniżej układ, zawartość i zachowanie każdego ekranu. Pliki źródłowe prototypu wskazane przy każdym ekranie.

### 5.1 Logowanie — `reference/screens-core.jsx` (`Login`)
- **Cel:** wejście do aplikacji przez magic-link.
- **Układ:** wyśrodkowany pionowo. Logo (kwadrat 64×64, `--r-lg`, tło `--accent`, ikona „waveform"), nazwa „Song Steward" (`--font-title`, 29px), podtytuł „Pieśni i nabożeństwa, zawsze pod ręką".
- **Formularz:** pole e-mail (z ikoną koperty), przycisk „Wyślij link logujący" (primary).
- **Po wysłaniu:** stan „Sprawdź skrzynkę" — karta z ikoną koperty + tekst „Wysłaliśmy link logujący na <email>…".
- **Stopka:** napis o dostępie na zaproszenie („Dostęp tylko na zaproszenie. Konta zakłada administrator.").
- **Implementacja realna:** `supabase.auth.signInWithOtp({ email })`. Po kliknięciu linku z maila Supabase przekierowuje z powrotem do aplikacji z sesją.

### 5.2 Pulpit — `reference/screens-core.jsx` (`Dashboard`)
- **Cel:** szybki przegląd „co dziś" + statystyki.
- **Nagłówek:** „Dzień dobry" / imię użytkownika; po prawej **chip lokalizacji** (patrz 6.4) + ikona koła zębatego (→ Ustawienia).
- **Karta „DZIŚ":** najbliższe/dzisiejsze nabożeństwo — kategoria · lokalizacja, prowadzący, przycisk **„Otwórz na żywo"**, liczniki (zaśpiewanych / zaplanowanych).
- **Przycisk „Nowe nabożeństwo"** (ghost).
- **Baner moderacji** (jeśli są oczekujące zmiany): „Moderacja tagów · N oczekujących zmian" → otwiera Panel moderacji.
- **Sekcja „Najczęściej śpiewane"** — lista rankingowa (numer, tytuł, badge zbioru, licznik `N×`).
- **Sekcja „Nigdy nieśpiewane"** — lista pieśni.
- **Podsumowanie filtrów (na dole):** zdanie w naturalnym języku opisujące aktywne filtry statystyk, np. *„Pokazuję statystyki dla lokalizacji Wrocław, z ostatnich 12 miesięcy, prowadzący: Aksel, z tagami: uwielbieniowa."* z afordancją **„Zmień ›"** → prowadzi do Ustawienia → Preferencje. Zdanie buduje się dynamicznie z aktywnych filtrów (patrz `Dashboard` → `sentence`).

### 5.3 Pieśni (biblioteka) — `reference/screens-library.jsx` (`SongLibrary`)
- **Cel:** przeglądanie/wyszukiwanie pieśni w zbiorach.
- **Pole szukania** (tytuł / autor / numer).
- **Rząd zbiorów** (poziomy scroll): DP, KM, NDP, NKM, SOS — wybór zbioru jako pill (aktywny = `include`).
- **Licznik wyników:** „Znaleziono N pieśni".
- **Lista pieśni** (karty `SongCard`): badge zbioru (np. „DP 14"), tytuł, autor (z avatarem), tonacja (np. „G dur" / „e-moll"). Tap → otwiera podgląd pieśni (5.7).

### 5.4 Szukaj po tagach — `reference/screens-library.jsx` (`TagSearch`)
- **Cel:** kluczowa funkcja sceniczna — szybkie filtrowanie pieśni po tagach.
- **Wzorzec: „Szybki" (progresywny).** Sticky-header u góry: tytuł „Szukaj", licznik wyników, aktywne filtry jako pills (z „×" do usunięcia). Poniżej **poziomy rząd popularnych tagów** (tylko te obecne w bieżących wynikach).
- **Wyniki najpierw** — lista pieśni pod headerem.
- **FAB „Wszystkie tagi"** (prawy dół) → otwiera bottom-sheet z pełną listą tagów pogrupowaną w kategorie (zwijane bloki `CatBlock`).
- **Interakcja na tagu:** **dotknięcie = dołącz (include)**, **przytrzymanie ~500 ms lub prawy przycisk = wyklucz (exclude)**. Ruch palcem >8px anuluje long-press (żeby scroll działał). Patrz `useLongPress` w `screens-library.jsx`.
- **Logika filtrowania:** pieśń pasuje, gdy zawiera **wszystkie** tagi „include" (AND) i **żadnego** z „exclude" (NOT). Patrz `matches()`.

### 5.5 Nabożeństwa (lista) — `reference/app.jsx` (`ServicesList`)
- Lista kart nabożeństw (data, kategoria · lokalizacja, prowadzący, liczniki). Dzisiejsze ma badge „DZIŚ" i otwiera ekran „Na żywo".
- **Filtr lokalizacji** (chip w nagłówku) zawęża listę; gdy aktywny — stopka „Pokazano nabożeństwa w: <lokalizacja>" i empty-state gdy brak.
- Ikona „+" → sheet „Nowe nabożeństwo".
- **Sheet „Nowe nabożeństwo"** (`NewServiceSheet` w `app.jsx`): data (dziś), lokalizacja (pills), kategoria (pills), prowadzący (pills, domyślnie zalogowany user). „Utwórz i otwórz" → ekran Na żywo.

### 5.6 Na żywo — `reference/screens-service.jsx` (`LiveService`)
- **Cel:** główny ekran roboczy podczas nabożeństwa.
- **Nagłówek:** „wstecz", badge „DZIŚ · NA ŻYWO", kategoria, meta-chipy (data, lokalizacja, prowadzący).
- **Notatki:** inline-edytowalne (tap → textarea; blur/Escape zapisuje, toast „Zapisano notatki").
- **Dodawanie pieśni:** pole szukania (tytuł/numer) → podpowiedzi z przyciskami „zaplanuj" (bookmark) / „zaśpiewana" (check). Plus przycisk **„Szukaj po tagach"** (→ ekran 5.4).
- **Sekcja „Zaplanowane"** — wiersze z uchwytem do przeciągania, przyciskiem „zaśpiewana" (promuje do sekcji niżej) i „×".
- **Sekcja „Zaśpiewane"** — numerowane wiersze, „×" do usunięcia.
- **Realnie:** zmiana statusu = update na `service_songs`; kolejność = pole `position` (drag&drop — sugest. `dnd-kit`). Wszystko **optymistycznie** (UI od razu, zapis w tle).
- **Wake Lock:** na tym ekranie ekran nie powinien gasnąć — użyj Wake Lock API.

### 5.7 Podgląd pieśni (bottom-sheet) — `reference/overlay.jsx` (`SongDetail`)
- **Otwierany** z dowolnej listy pieśni jako **bottom-sheet** (scrim + wysuwany panel).
- **Nagłówek:** zdjęcie/placeholder (okrągłe 76px), badge zbioru, tytuł (`--font-title` 23px), autor, tonacja.
- **Akcje** (gdy w kontekście nabożeństwa): „Zaplanuj" / „Zaśpiewana"; zawsze: **„Dodaj do najbliższego nabożeństwa"**.
- **Tagi:** najpierw **wszystkie wybrane tagi (ze wszystkich kategorii) jako podsumowanie u góry**, potem **zwijane bloki per kategoria** (`CatBlock`). W rozwiniętej kategorii widać wybrane (podświetlone) + pozostałe (przygaszone, do dodania). Patrz `SongDetail`.
- **Źródła tagów (KLUCZOWE — patrz 6.1):** każdy tag ma źródło: `confirmed` (niebieski), `user` (bursztynowy), `ai` (fioletowy). Kategoria „Tagi SSF" jest **tylko do odczytu** (kłódka; próba edycji = animacja „shake").
- **Nawigacja:** strzałki ←/→ przełączają pieśni w obrębie bieżącej listy; swipe w dół zamyka.
- **Historia śpiewania:** lista ostatnich wykonań (data · lokalizacja · prowadzący).

### 5.8 Ustawienia — `reference/screens-admin.jsx` (`Settings`)
Dwie zakładki (segmented control):

**A) „Zarządzanie"** (rzeczy wspólne dla zboru):
- **Wejście do Panelu moderacji** (z liczbą oczekujących zmian).
- **Słowniki danych** — lista 6 słowników z licznikami: Lokalizacje, Kategorie nabożeństw, Prowadzący, Zbiory pieśni, Kategorie tagów, Tagi. Każdy otwiera edytor CRUD (`DictEditor` — sheet z dodawaniem/zmianą nazwy/usuwaniem). Prowadzący pokazują powiązanie z kontem (email) lub „Gość — brak konta". Kategorie tagów pokazują flagę „tylko odczyt".
- **„Wyloguj się".**

**B) „Preferencje"** (rzeczy osobiste, zapamiętane per użytkownik/urządzenie):
- **Wygląd / Motyw:** wybór **Jasny / Ciemny** (zapis w `localStorage`, klucz `ss-theme`). Atrybut `data-theme` na korzeniu aplikacji.
- **Globalny filtr lokalizacji:** pills („Wszystkie" + lokalizacje). Wpływa na Pulpit, listę Nabożeństw i statystyki.
- **Domyślne filtry statystyk:** Prowadzący (pills), Zakres czasu (3/6/12 mies. / Cały czas).
- **Tagi statystyk:** wybrane tagi jako podsumowanie u góry + zwijane bloki per kategoria (ten sam wzorzec co podgląd pieśni i Szukaj). Include/exclude jak w 5.4. „Wyczyść" czyści wybór.
- Wersja aplikacji (stopka).

### 5.9 Panel moderacji — `reference/screens-admin.jsx` (`Moderation`)
- **Cel:** zatwierdzanie/odrzucanie oczekujących zmian w tagach, **pogrupowanych per pieśń**.
- Liczniki na górze: „N do dodania" (bursztyn), „N do usunięcia" (czerwień).
- Przycisk **„Zatwierdź wszystko (N)".**
- Każda karta = pieśń + lista zmian:
  - **Dodanie** (tag bursztynowy) → ✓ zatwierdź / ✗ anuluj.
  - **Usunięcie** (tag czerwony, przekreślony) → ✓ zatwierdź usunięcie / ↻ przywróć.
  - Po decyzji można cofnąć (↻).
- **Empty-state** gdy nic nie zostało: „Wszystko zatwierdzone".
- **Realnie:** zmiany to wiersze `song_tags` z polami `source` i `pending_removal` (patrz model danych w spec). Zatwierdzenie dodania = ustaw `source='confirmed'` (lub zdejmij flagę „pending"); zatwierdzenie usunięcia = usuń wiersz; przywrócenie = wyczyść `pending_removal`.

---

## 6. Wzorce przekrojowe (cross-cutting)

### 6.1 Źródła tagów — STAŁE kolory (nie zmieniać!)
Każdy tag ma „źródło", kodowane kolorem **niezależnie od motywu/akcentu**:
| Źródło | Znaczenie | Token koloru |
|---|---|---|
| `confirmed` | zatwierdzony | `--src-confirmed` (niebieski) |
| `user` | dodany przez użytkownika / oczekujący | `--src-user` (bursztynowy) |
| `ai` | zaproponowany przez AI | `--src-ai` (fioletowy) |
Klasy w prototypie: `.tag.src-confirmed`, `.tag.src-user`, `.tag.src-ai`. Stan filtra: `.tag.include` (akcent), `.tag.exclude` (czerwony, przekreślony).

### 6.2 Tag pill — interakcja include/exclude
Wspólna dla Szukania i filtrów statystyk: **tap = include**, **long-press ~500 ms / prawy przycisk = exclude**, ruch >8px anuluje long-press. Reużyj jednego hooka (`useLongPress` z `screens-library.jsx`).

### 6.3 Bottom-sheet
Scrim (`--scrim`) + wysuwany panel (`border-radius: 26px 26px 0 0`, `--shadow-pop`, uchwyt „grab" u góry). Używany w: podgląd pieśni, „Wszystkie tagi", „Nowe nabożeństwo", edytor słownika. Zrób jeden komponent `Sheet`.
> **Ważne (animacje):** w prototypie wejścia animują się „od" stanu ukrytego do widocznego (stan spoczynkowy = widoczny), żeby działały też przy `prefers-reduced-motion`. Zachowaj tę zasadę: element ma być widoczny bez animacji, animacja tylko go „wprowadza".

### 6.4 Chip globalnej lokalizacji
Wskaźnik aktywnego filtra lokalizacji, **jedno źródło prawdy** (stan w Ustawienia → Preferencje):
- **Nieaktywny** („Wszystkie") → tylko **ikona pinezki** (jak zwykły icon-button).
- **Aktywny** → **chip z nazwą lokalizacji** (akcentowy), ikona pinezki + nazwa.
- **Brak przycisku „×"** — usunięcie tylko przez Ustawienia (świadoma decyzja, nie przypadkowy reset na scenie).
- **Tap → Ustawienia → Preferencje** (deep-link do zakładki filtrów, z krótkim podświetleniem kontrolki).
Widoczny wszędzie, gdzie filtr działa: Pulpit, Nabożeństwa. Patrz `LocationChip` w `ui.jsx`.

### 6.5 Optymistyczne UI
Wszystkie mutacje (dodanie pieśni, zmiana statusu, edycja tagów, moderacja) aktualizują UI **natychmiast**, zapis w tle. Sugerowane: **TanStack Query** z `onMutate`/optimistic updates + rollback przy błędzie.

---

## 7. Stan i dane

### 7.1 Stan lokalny (klient)
- **Motyw** — `localStorage['ss-theme']` (`'light'`|`'dark'`), `data-theme` na root.
- **Globalny filtr lokalizacji** + **domyślne filtry statystyk** (prowadzący, zakres, tagi include/exclude) — preferencje per użytkownik. W prototypie trzymane w stanie aplikacji; realnie: `localStorage` (lub tabela preferencji, jeśli mają być per-konto między urządzeniami — do decyzji klienta).
- Nawigacja: hash route.

### 7.2 Dane serwerowe (Supabase)
- Istniejąca baza PostgreSQL na Supabase — **nie ruszać schematu produkcyjnego** poza migracjami addytywnymi.
- **Auth:** Supabase Auth, magic-link, rejestracja publiczna **wyłączona** (tylko zaproszenia).
- **RLS:** włączyć model „authenticated = pełny dostęp; anon = brak". Jedna prosta polityka per tabela.
- **Powiązanie prowadzącego z kontem:** migracja addytywna (np. `worship_leaders.auth_user_id` + email); przy pierwszym logowaniu dopasuj email → wiersz prowadzącego, by domyślnie podstawiać użytkownika jako prowadzącego.
- **Złożone operacje jako funkcje/widoki SQL (RPC), nie liczone na telefonie:**
  - Statystyki „Najczęściej śpiewane" / „Nigdy nieśpiewane" z filtrami (lokalizacja, prowadzący, zakres czasu, tagi include/exclude).
  - Wyszukiwanie po tagach AND/NOT (jeśli wydajniej po stronie bazy).
- **Klient:** `@supabase/supabase-js` + **TanStack Query** (cache + optymistyczne UI).
- **Walidacja wejść:** `zod` na froncie (wymóg spec).

> Dokładny schemat tabel (`songs`, `song_tags`, `tags`, `tag_categories`, `collections`, `services`, `service_songs`, `worship_leaders`, `locations`, `service_categories`) i przykładowe zapytania — patrz oryginalna specyfikacja, sekcje modelu danych i §7. Plik `reference/data.js` pokazuje **kształt danych** używany w prototypie (dobry punkt odniesienia dla typów TS).

---

## 8. Design tokens

> Źródło prawdy: `reference/styles.css` (sekcje na górze pliku). Kolory w **OKLCH**. Tailwind v4 pozwala wpiąć je jako zmienne CSS w `@theme`. Zdefiniuj je raz na `:root` / `[data-theme]` i mapuj na klasy Tailwinda.

### 8.1 Typografia
- **Tytuły** (`--font-title`): **Spectral** (serif), weight 600.
- **Treść** (`--font-body`): **Hanken Grotesk**, 400–700.
- **Mono/liczby** (`--font-mono`): **Space Grotesk** (z `font-feature-settings: "tnum"` dla liczb).
- Skala (przykłady z prototypu): H1 nagłówka ekranu 24–30px, tytuł pieśni 16–23px, label 11px (`letter-spacing .02em`), body 13–15px.
- Import Google Fonts: patrz `@import` na górze `styles.css`.

### 8.2 Promienie (styl „Reverent")
`--r-lg: 22px` · `--r-md: 16px` · `--r-sm: 11px` · `--r-pill: 999px`.

### 8.3 Kolory — źródła tagów (stałe, oba motywy)
**Light:** confirmed `oklch(0.52 0.14 256)` · user `oklch(0.60 0.12 74)` · ai `oklch(0.54 0.16 300)` · danger `oklch(0.55 0.19 27)` (każdy ma warianty `-soft` i `-bd`).
**Dark:** confirmed `oklch(0.74 0.12 256)` · user `oklch(0.80 0.11 78)` · ai `oklch(0.74 0.14 300)` · danger `oklch(0.70 0.17 27)`.

### 8.4 Paleta rdzenna — „Reverent / Light"
```
--bg: oklch(0.984 0.006 95);   --bg-2: oklch(0.965 0.008 95);
--surface: oklch(0.998 0.003 95); --surface-2: oklch(0.972 0.007 95);
--border: oklch(0.905 0.008 95);  --border-strong: oklch(0.84 0.01 95);
--text: oklch(0.26 0.012 70); --text-2: oklch(0.47 0.011 70); --text-3: oklch(0.63 0.009 70);
--accent: oklch(0.55 0.072 156);  --accent-press: oklch(0.48 0.072 156);
--accent-soft: oklch(0.93 0.035 156); --accent-bd: oklch(0.83 0.05 156); --accent-contrast: oklch(0.99 0.01 156);
```

### 8.5 Paleta rdzenna — „Reverent / Dark"
```
--bg: oklch(0.185 0.008 150);  --bg-2: oklch(0.155 0.008 150);
--surface: oklch(0.235 0.01 150); --surface-2: oklch(0.285 0.012 150);
--border: oklch(0.33 0.012 150);  --border-strong: oklch(0.42 0.014 150);
--text: oklch(0.95 0.006 95); --text-2: oklch(0.75 0.008 95); --text-3: oklch(0.58 0.008 95);
--accent: oklch(0.74 0.08 156);   --accent-press: oklch(0.68 0.08 156);
--accent-soft: oklch(0.32 0.04 156); --accent-bd: oklch(0.42 0.05 156); --accent-contrast: oklch(0.17 0.02 156);
```

### 8.6 Cienie i scrim
- `--shadow-card` (light): `0 1px 2px rgba(20,20,30,0.05), 0 4px 14px rgba(20,20,30,0.05)`
- `--shadow-pop` (light): `0 6px 16px rgba(20,20,30,0.10), 0 24px 48px rgba(20,20,30,0.16)`
- `--scrim` (light): `rgba(28,26,22,0.38)` · (dark): `rgba(0,0,0,0.55)`
- (Warianty dark: patrz `styles.css`.)

### 8.7 Odstępy / wymiary
- Padding ekranu: `0 18px` (poziomo); dół z miejscem na tab bar: `calc(96px + env(safe-area-inset-bottom))`.
- Tab bar: wys. 62px, „pływający" 10px od krawędzi, `backdrop-filter: blur`.
- **Minimalny hit target: 48px** (przyciski `.btn` mają `min-height: 48px`).
- Status bar / safe areas: respektuj `env(safe-area-inset-*)` (PWA na iOS).

---

## 9. Ikony
Prototyp używa własnego, spójnego zestawu ikon liniowych (stroke 1.7px, `currentColor`) — patrz `reference/icons.jsx` (home, music, search, tag, calendar, settings, plus, check, x, chevrony, bookmark, drag, user, sun, moon, filter, clock, pin, mail, layers, sparkle, chart, lock, pencil, history, waveform…).
**Rekomendacja:** w docelowej apce użyj gotowej biblioteki o podobnym charakterze (np. **lucide-react** — większość nazw się pokrywa), zamiast przepisywać SVG ręcznie. Zachowaj liniowy, lekki styl.

## 10. Assety
- **Brak zewnętrznych grafik.** Zdjęcia autorów/pieśni są placeholderami (okręgi). Jeśli klient ma realne zdjęcia — wstawić w miejsca placeholderów w podglądzie pieśni.
- Fonty: Google Fonts (Spectral, Hanken Grotesk, Space Grotesk).
- **Dane w `reference/data.js` są przykładowe** (zmyślone, ale realistyczne) — NIE używać w produkcji, służą tylko za wzór kształtu danych i do podglądu prototypu.

---

## 11. Hosting i CI/CD — GitHub Pages

- Build statyczny (Vite) → publikacja na **GitHub Pages**.
- **Auto-deploy:** workflow GitHub Actions na push do `main` (build + deploy). Szkic: `deploy.yml.example` w tym folderze.
- **Hash routing obowiązkowy** — GitHub Pages nie przekierowuje ścieżek do `index.html`, więc bez hash routingu odświeżenie/deep-link na np. `/piesni/123` da 404. Użyj `createHashRouter`. (Alternatywa: sztuczka z `404.html`, ale hash jest prostszy i wystarczający dla apki za loginem.)
- W `vite.config.ts` ustaw `base` na nazwę repo, jeśli deploy pod `https://<user>.github.io/<repo>/` (a nie na własnej domenie).

---

## 12. Sugerowana kolejność implementacji
1. Szkielet: Vite + React + TS + Tailwind; wpięcie tokenów (sekcja 8) i fontów; `data-theme` + przełącznik motywu.
2. Layout aplikacji: tab bar, hash routing, komponent `Sheet`, prymitywy (`Button`, `TagPill`, `SongCard`, `CatBlock`, `Seg`, `LocationChip`).
3. Supabase: klient, bramka auth (magic-link), migracja addytywna prowadzących, włączenie RLS.
4. Warstwa danych (TanStack Query) + typy z kształtu `data.js`.
5. Ekrany wg wartości: Logowanie → Pulpit → Na żywo → Pieśni → Szukaj → Podgląd pieśni → Nabożeństwa → Ustawienia → Moderacja.
6. PWA (manifest, instalowalność), Wake Lock na „Na żywo".
7. Workflow deploy na GitHub Pages.

---

## 13. Pliki referencyjne (w `reference/`)
| Plik | Zawartość |
|---|---|
| `Song Steward.html` | Punkt wejścia prototypu — otwórz w przeglądarce, by zobaczyć całość |
| `styles.css` | **Źródło prawdy dla tokenów** (kolory, typografia, promienie, cienie) + klasy komponentów |
| `data.js` | Kształt danych + przykładowa zawartość (wzór dla typów TS) |
| `icons.jsx` | Zestaw ikon liniowych (mapowanie na lucide-react) |
| `ui.jsx` | Prymitywy: `SongCard`, `TagPill`, `Seg`, `CatBlock`, `LocationChip`, `MetaChip`… |
| `overlay.jsx` | Podgląd pieśni (bottom-sheet) |
| `screens-core.jsx` | Logowanie + Pulpit |
| `screens-library.jsx` | Biblioteka pieśni + Szukaj po tagach (`useLongPress`, `matches`) |
| `screens-service.jsx` | Ekran „Na żywo" |
| `screens-admin.jsx` | Ustawienia (Zarządzanie/Preferencje) + Panel moderacji + edytor słowników |
| `frames/ios-frame.jsx` | Atrapa ramki telefonu (tylko prezentacja — NIE odtwarzać) |

> **Najlepszy start:** otwórz `Song Steward.html`, przeklikaj wszystkie ekrany i oba motywy, a `styles.css` trzymaj otwarty jako słownik tokenów.
