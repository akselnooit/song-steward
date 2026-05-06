# Specyfikacja aplikacji: Song Steward

## 1. Cel i kontekst

**Song Steward** to aplikacja webowa (PWA) dla osoby odpowiedzialnej za prowadzenie pieśni w ewangelicznym kościele. Umożliwia zarządzanie bazą pieśni, planowanie i rejestrowanie pieśni na nabożeństwach oraz inteligentne wyszukiwanie pieśni po tagach w czasie rzeczywistym — w tym w trakcie nabożeństwa na telefonie.

Nazwa nawiązuje do biblijnej koncepcji *stewardship* — odpowiedzialnego zarządzania tym, co zostało powierzone. Lider muzyczny jest stewardem repertuaru pieśni zboru.

**Główny użytkownik:** Jedna osoba (prowadzący pieśni), docelowo możliwość rozszerzenia na wielu użytkowników.

---

## 2. Stack technologiczny

| Warstwa | Technologia |
|---|---|
| Frontend | Next.js 16 (App Router) + React 19 |
| Styl | Tailwind CSS v4 |
| Backend | Next.js API Routes (serverless) |
| Baza danych | Supabase (PostgreSQL) |
| Hosting | Vercel |
| Język | TypeScript |

**Zasady architektury:**
- Prosta, płaska struktura folderów
- Minimalna liczba zewnętrznych bibliotek
- Każdy plik powinien mieć jeden, jasny cel

---

## 3. Schemat bazy danych (Supabase / PostgreSQL)

### `collections` — Zbiory pieśni (śpiewniki, zeszyty, itp.)
```sql
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,           -- np. "Drogi Pańskie"
  short_name TEXT NOT NULL,     -- np. "DP"
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
  author_image TEXT,             -- URL zdjęcia autora
  author_id TEXT,                -- ID autora z SongTreasures
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
│   │   ├── page.tsx            # Baza pieśni (domyślnie: Drogi Pańskie, sortowanie wg numeru)
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
│       ├── service-songs/route.ts
│       ├── service-songs/[id]/route.ts
│       ├── collections/route.ts
│       ├── collections/[id]/route.ts
│       ├── tags/route.ts
│       ├── tags/[id]/route.ts
│       ├── tag-categories/route.ts
│       ├── tag-categories/[id]/route.ts
│       ├── service-types/route.ts
│       ├── service-types/[id]/route.ts
│       ├── worship-leaders/route.ts
│       └── worship-leaders/[id]/route.ts
├── components/
│   ├── TagFilter.tsx           # Filtrowanie pieśni po tagach (zawężanie)
│   ├── SongCard.tsx            # Karta pieśni
│   ├── ServiceSongList.tsx     # Lista pieśni na nabożeństwie
│   └── BottomNav.tsx           # Nawigacja dolna
├── lib/
│   ├── supabase.ts             # Klient Supabase
│   └── types.ts                # Definicje TypeScript
├── data/
│   ├── songs                   # Surowe dane z SongTreasures API (1158 pieśni)
│   ├── contributors            # Dane autorów z SongTreasures API
│   ├── import-songs.mjs        # Skrypt importu kolekcji i pieśni
│   └── import-authors.mjs      # Skrypt importu autorów i zdjęć
├── .claude/
│   └── launch.json             # Konfiguracja serwerów deweloperskich
└── public/
    └── manifest.json           # PWA manifest
```

---

## 5. Funkcjonalności — szczegółowy opis

### 5.1 Baza pieśni (`/songs`)

- Lista wszystkich pieśni z wyszukiwarką (po tytule, numerze, autorze)
- Filtrowanie po zbiorze (collection) — domyślnie wybrane "Drogi Pańskie"
- Sortowanie według numeru pieśni w zbiorze
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
- **Najbliższe nabożeństwo** (jeśli istnieje przyszłe) lub ostatnie nabożeństwo: data, typ, liczba pieśni
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

Instalacja na iOS: Safari → przycisk "Udostępnij" → "Dodaj do ekranu głównego".

---

## 7. Konfiguracja środowiska

### Plik `.env.local` (lokalny, nigdy nie commitować do Git!)
```
NEXT_PUBLIC_SUPABASE_URL=twój_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=twój_supabase_publishable_key
```

### Zmienne środowiskowe w Vercel
Te same wartości dodaj w panelu Vercel: Settings → Environment Variables.

---

## 8. Import danych (SongTreasures)

Dane pieśni pochodzą z API SongTreasures. Surowe pliki JSON przechowywane są w folderze `data/`.

### Zaimportowane kolekcje

| Skrót | Nazwa | Liczba pieśni |
|-------|-------|--------------|
| DP  | Drogi Pańskie           | 471 |
| KM  | Kwiat Migdałowy         | 445 |
| SOS | Sing Our Songs          | 52  |
| NKM | Kwiat Migdałowy - dodatek | 10 |
| NDP | Drogi Pańskie - dodatek   | 6  |

**Kolekcja pominięta:** 174 pieśni (norweska, brak polskich tytułów).

### Uruchamianie skryptów importu

```bash
# Import kolekcji i pieśni
node data/import-songs.mjs

# Import autorów i zdjęć autorów
node data/import-authors.mjs
```

### Kolejność tytułów (fallback)
Jeśli brak polskiego tytułu: norweski → angielski → pierwszy dostępny język.

---

## 9. Proces developmentu i publikacji

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

Claude Code to narzędzie CLI + aplikacja desktopowa, które pozwala Claude pisać i modyfikować pliki bezpośrednio w Twoim projekcie. Uruchomienie w folderze projektu:
```bash
claude
```

Serwer deweloperski uruchamiany przez Claude Code skonfigurowany jest w `.claude/launch.json`.

---

## 10. Bezpieczeństwo (MVP)

Na start (jeden użytkownik):
- Supabase Row Level Security (RLS) — wyłączone dla uproszczenia na MVP
- Klucz `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` jest publiczny — to normalne dla aplikacji bez logowania
- Aplikacja nie ma systemu logowania (MVP tylko dla Ciebie)

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
- [ ] Import pozostałej kolekcji norweskiej (174 pieśni) po weryfikacji tytułów
