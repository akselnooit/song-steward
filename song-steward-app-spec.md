# Specyfikacja aplikacji: Song Steward

## 1. Cel i kontekst

**Song Steward** to aplikacja webowa (PWA) dla osoby odpowiedzialnej za prowadzenie pieśni w ewangelicznym kościele. Umożliwia zarządzanie bazą pieśni, planowanie i rejestrowanie pieśni na nabożeństwach oraz inteligentne wyszukiwanie pieśni po tagach w czasie rzeczywistym — w tym w trakcie nabożeństwa na telefonie.

Nazwa nawiązuje do biblijnej koncepcji *stewardship* — odpowiedzialnego zarządzania tym, co zostało powierzone. Lider muzyczny jest stewardem repertuaru pieśni zboru.

**Główny użytkownik:** Jedna osoba (prowadzący pieśni), docelowo możliwość rozszerzenia na wielu użytkowników.

---

## 2. Stack technologiczny

| Warstwa | Technologia |
|---|---|
| Frontend | Next.js 14 (App Router) + React |
| Styl | Tailwind CSS |
| Backend | Next.js API Routes (serverless) |
| Baza danych | Supabase (PostgreSQL) |
| Hosting | Vercel |
| Język | TypeScript |

**Zasady architektury:**
- Prosta, płaska struktura folderów
- Minimalna liczba zewnętrznych bibliotek
- Każdy plik powinien mieć jeden, jasny cel
- Komentarze w kodzie tam, gdzie logika jest nieoczywista

---

## 3. Schemat bazy danych (Supabase / PostgreSQL)

### `collections` — Zbiory pieśni (śpiewniki, zeszyty, itp.)
```sql
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,           -- np. "Śpiewnik Ewangeliczny"
  short_name TEXT NOT NULL,     -- np. "SE"
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `songs` — Pieśni
```sql
CREATE TABLE songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,       -- numer w zbiorze
  title TEXT NOT NULL,
  author TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, number)  -- numer unikatowy w ramach zbioru
);
```

### `tag_categories` — Kategorie tagów
```sql
CREATE TABLE tag_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,    -- np. "Okazja", "Tematyka", "Nastrój"
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `tags` — Tagi
```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES tag_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL UNIQUE,    -- np. "Miłość", "Rozpoczęcie", "Wielkanoc"
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `song_tags` — Przypisanie tagów do pieśni
```sql
CREATE TABLE song_tags (
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (song_id, tag_id)
);
```

### `service_types` — Typy nabożeństw
```sql
CREATE TABLE service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,    -- np. "Niedzielne Wrocław", "Konferencja Ukraina"
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `worship_leaders` — Liderzy muzyki (osoby prowadzące śpiew, nie nabożeństwo)
```sql
CREATE TABLE worship_leaders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `services` — Nabożeństwa
```sql
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type_id UUID REFERENCES service_types(id) ON DELETE SET NULL,
  worship_leader_id UUID REFERENCES worship_leaders(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `service_songs` — Pieśni na nabożeństwie
```sql
CREATE TABLE service_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('planned', 'sung')),
  -- 'planned' = zaplanowana przed nabożeństwem (wymaga potwierdzenia)
  -- 'sung'    = podana podczas nabożeństwa (potwierdzona, nie wymaga potwierdzenia)
  song_order INTEGER,
  added_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Struktura projektu (Next.js)

Nazwa folderu projektu i repozytorium GitHub: `song-steward`

```
song-steward/
├── app/
│   ├── layout.tsx              # Główny layout, nawigacja dolna (mobile-first)
│   ├── page.tsx                # Dashboard
│   ├── services/
│   │   ├── page.tsx            # Lista nabożeństw
│   │   ├── new/page.tsx        # Tworzenie nabożeństwa
│   │   └── [id]/page.tsx       # Szczegóły: planowanie + prowadzenie na żywo
│   ├── songs/
│   │   ├── page.tsx            # Baza pieśni
│   │   └── [id]/page.tsx       # Szczegóły pieśni (tagi, historia śpiewania)
│   ├── search/
│   │   └── page.tsx            # Wyszukiwanie po tagach (widok "na nabożeństwo")
│   ├── settings/
│   │   └── page.tsx            # Konfiguracja słowników
│   └── api/
│       ├── songs/route.ts
│       ├── songs/[id]/route.ts
│       ├── services/route.ts
│       ├── services/[id]/route.ts
│       └── tags/route.ts
├── components/
│   ├── TagFilter.tsx           # Filtrowanie pieśni po tagach (zawężanie)
│   ├── SongCard.tsx            # Karta pieśni
│   ├── ServiceSongList.tsx     # Lista pieśni na nabożeństwie
│   └── ui/                    # Przyciski, inputy, modalne okna
├── lib/
│   ├── supabase.ts             # Klient Supabase
│   └── types.ts                # Definicje TypeScript
└── public/
    └── manifest.json           # PWA manifest
```

---

## 5. Funkcjonalności — szczegółowy opis

### 5.1 Baza pieśni (`/songs`)

- Lista wszystkich pieśni z wyszukiwarką (po tytule, numerze, autorze)
- Filtrowanie po zbiorze (collection)
- Dla każdej pieśni widoczne: numer, tytuł, autor, zbiór, lista tagów
- Możliwość edycji tagów pieśni
- Statystyki na karcie pieśni: ile razy śpiewana łącznie, kiedy ostatnio

### 5.2 Wyszukiwanie po tagach — widok "na nabożeństwo" (`/search`)

**Kluczowy widok — używany w trakcie nabożeństwa na telefonie. Musi być szybki i czytelny.**

**Logika zawężania:**
1. Na starcie wyświetl wszystkie tagi (pogrupowane wg kategorii)
2. Użytkownik klika tag np. "Miłość" → lista pieśni filtruje się do tych z tym tagiem
3. Poniżej listy pieśni pojawiają się **tylko tagi obecne w aktualnie wyfiltrowanych pieśniach**
4. Użytkownik klika kolejny tag np. "Rozpoczęcie" → lista zawęża się do pieśni mających OBA tagi
5. Można dodawać kolejne tagi — lista pieśni dalej się zawęża
6. Kliknięcie aktywnego tagu usuwa go — lista się poszerza
7. Przycisk "Wyczyść" resetuje wszystkie filtry
8. Wyfiltrowaną pieśń można jednym kliknięciem dodać do aktywnego nabożeństwa jako `sung`

**Wymagania UI:**
- Duże, łatwe do kliknięcia przyciski tagów (co najmniej 44px wysokości)
- Aktywne tagi wyraźnie wyróżnione kolorem
- Lista pieśni aktualizuje się bez przeładowania strony (React state)
- Widoczna liczba wyników: "Znaleziono 12 pieśni"
- Jeśli brak wyników: komunikat "Brak pieśni spełniających wszystkie filtry"

### 5.3 Nabożeństwa (`/services`)

**Lista nabożeństw:**
- Sortowane od najnowszego
- Widoczne: data, typ, lider muzyki, liczba pieśni zaśpiewanych
- Kliknięcie → widok szczegółów

**Tworzenie nabożeństwa (`/services/new`):**
- Pola: data (domyślnie dzisiaj), typ nabożeństwa (select), lider muzyki (select), notatki (opcjonalne)
- Zapis → przekierowanie do widoku szczegółów

**Widok nabożeństwa (`/services/[id]`):**

Dwie wyraźne sekcje:

**A) Pieśni zaplanowane** (`status = 'planned'`)
- Dodawane przed nabożeństwem podczas przygotowań
- Każda pieśń ma przycisk **"✓ Zaśpiewana"** — po kliknięciu zmienia status na `sung`
- Każda pieśń ma przycisk usunięcia (bez potwierdzenia)
- Można dodawać przez wyszukiwarkę (tytuł / numer)

**B) Pieśni zaśpiewane** (`status = 'sung'`)
- Dodawane podczas nabożeństwa przez widok wyszukiwania po tagach lub wyszukiwarkę
- Nie wymagają potwierdzenia — od razu trafiają tutaj
- Wyświetlone z kolejnością (1, 2, 3...)
- Pieśni przeniesione z sekcji A (po potwierdzeniu) też tu lądują

**Dodawanie pieśni do nabożeństwa:**
- Pole wyszukiwania (tytuł / numer) z autouzupełnianiem
- Przycisk "🔖 Szukaj po tagach" → otwiera `/search` z zapamiętanym kontekstem aktywnego nabożeństwa

### 5.4 Dashboard (`/`)

- Łączna liczba pieśni w bazie
- Ostatnie nabożeństwo: data, typ, liczba pieśni
- Top 5 **najczęściej** śpiewanych pieśni (ostatnie 3 miesiące)
- Top 5 **najrzadziej** śpiewanych pieśni (spośród tych, które były kiedyś śpiewane)
- Przycisk: "＋ Nowe nabożeństwo"

### 5.5 Ustawienia (`/settings`)

Zarządzanie słownikami — pełny CRUD (dodaj / edytuj / usuń) dla:
- **Typy nabożeństw** (np. "Niedzielne Wrocław", "Konferencja Ukraina", "Nabożeństwa Ustroń")
- **Liderzy muzyki** (imię i nazwisko)
- **Zbiory pieśni** (nazwa pełna, skrót)
- **Kategorie tagów**
- **Tagi** (nazwa, opis, kategoria)

---

## 6. PWA — konfiguracja

Plik `public/manifest.json`:
```json
{
  "name": "Song Steward",
  "short_name": "Song Steward",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1e3a5f",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

W `app/layout.tsx` dodaj meta tagi:
```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<link rel="apple-touch-icon" href="/icon-192.png" />
```

Instalacja na iOS: Safari → przycisk "Udostępnij" → "Dodaj do ekranu głównego".

---

## 7. Konfiguracja środowiska

### Plik `.env.local` (lokalny, nigdy nie commitować do Git!)
```
NEXT_PUBLIC_SUPABASE_URL=twój_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=twój_supabase_anon_key
```

### Zmienne środowiskowe w Vercel
Te same wartości dodaj w panelu Vercel: Settings → Environment Variables.

---

## 8. Proces developmentu i publikacji

### Jednorazowy setup (wykonaj raz na początku)

1. Zainstaluj [Node.js](https://nodejs.org) (wersja LTS) — potrzebny do uruchamiania projektu lokalnie i instalowania paczek
2. Zainstaluj [Git](https://git-scm.com)
3. Załóż konto na [GitHub](https://github.com) i utwórz nowe repozytorium (prywatne)
4. Załóż konto na [Vercel](https://vercel.com), połącz z GitHubem, zaimportuj repozytorium — Vercel od tej chwili automatycznie publikuje każdy push do gałęzi `main`
5. Załóż konto na [Supabase](https://supabase.com), utwórz projekt, uruchom SQL z sekcji 3 niniejszej specyfikacji

### Codzienny flow pracy

```
Edytujesz kod lokalnie (lub przez Claude Code)
        ↓
npm run dev  →  podgląd na localhost:3000 w przeglądarce
        ↓
git add . && git commit -m "opis zmiany"
        ↓
git push
        ↓
Vercel automatycznie buduje i publikuje (ok. 1 minuta)
        ↓
Aplikacja dostępna pod Twoim adresem Vercel (lub własną domeną)
```

### Praca z Claude Code (rekomendowane)

Claude Code to narzędzie CLI, które pozwala Claude pisać i modyfikować pliki bezpośrednio w Twoim projekcie na komputerze. Instalacja:
```bash
npm install -g @anthropic-ai/claude-code
```

Uruchomienie w folderze projektu:
```bash
claude
```

Claude Code może samodzielnie: tworzyć i edytować pliki, instalować paczki (`npm install`), uruchamiać komendy — w tym `git commit` i `git push`. Wystarczy opisać mu zadanie słowami, a on wykona je w terminalu bez konieczności ręcznego kopiowania kodu.

---

## 9. Import danych początkowych przez Supabase

Dane wgrywasz bezpośrednio przez panel Supabase bez żadnych dodatkowych narzędzi:

- **Zbiory, typy nabożeństw, liderzy muzyki:** wpisz ręcznie przez Table Editor w Supabase (kilka rekordów)
- **Kategorie tagów i tagi:** wpisz ręcznie lub zaimportuj CSV przez Table Editor → "Import data"
- **Pieśni:** zaimportuj CSV przez Table Editor → "Import data"

Wymagany format CSV dla pieśni (collection_id to UUID skopiowane z tabeli `collections`):
```
collection_id,number,title,author
twój-uuid-zbioru,1,Błogosław Panie nas,Jan Kowalski
twój-uuid-zbioru,2,Chwała Bogu na wysokości,
```

---

## 10. Bezpieczeństwo (MVP)

Na start (jeden użytkownik):
- Supabase Row Level Security (RLS) — wyłączone dla uproszczenia na MVP
- Klucz `NEXT_PUBLIC_SUPABASE_ANON_KEY` jest publiczny — to normalne dla aplikacji bez logowania
- Aplikacja nie ma systemu logowania (MVP tylko dla Ciebie)
- Aplikacja nie jest linkowana publicznie, więc ryzyko nieautoryzowanego dostępu jest minimalne

W przyszłości (wielu użytkowników):
- Supabase Auth (logowanie emailem lub Google)
- RLS: wspólna baza pieśni, ale własne nabożeństwa per użytkownik

---

## 11. Przyszłe funkcje (nie implementować teraz)

- [ ] Konta dla wielu liderów muzyki z własnym dostępem i logowaniem
- [ ] Widok statystyk per lider ("Marek najczęściej podaje pieśni o Miłości")
- [ ] Analiza pokrycia tagów (które tagi są rzadko używane w kontekście pieśni)
- [ ] Eksport listy pieśni z nabożeństwa do PDF
- [ ] Powiadomienia push przed nabożeństwem

---

## 12. Kolejność implementacji (sugerowana)

1. **Setup:** GitHub repo (`song-steward`), Node.js lokalnie, `npx create-next-app song-steward`, Supabase (tabele z sekcji 3), Vercel (połączenie z GitHub), `.env.local`
2. **Baza pieśni:** widok listy (`/songs`) i szczegółów (`/songs/[id]`)
3. **Tagi:** przypisywanie tagów do pieśni, widok kategorii
4. **Wyszukiwanie po tagach:** widok `/search` z logiką zawężania
5. **Nabożeństwa:** tworzenie, statusy `planned`/`sung`, dodawanie pieśni
6. **Dashboard:** statystyki (`/`)
7. **Ustawienia:** CRUD słowników (`/settings`)
8. **PWA:** manifest, meta tagi, ikony
9. **Testy na iOS:** Safari → "Dodaj do ekranu głównego"
