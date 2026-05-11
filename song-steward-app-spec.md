# Specyfikacja aplikacji: Song Steward

> Ostatnia aktualizacja: maj 2026

## 1. Cel i kontekst

**Song Steward** to aplikacja webowa (PWA) dla osób odpowiedzialnych za prowadzenie pieśni w ewangelicznym kościele. Umożliwia zarządzanie bazą pieśni, planowanie i rejestrowanie pieśni na nabożeństwach oraz inteligentne wyszukiwanie pieśni po tagach w czasie rzeczywistym — w tym w trakcie nabożeństwa na telefonie.

Nazwa nawiązuje do biblijnej koncepcji *stewardship* — odpowiedzialnego zarządzania tym, co zostało powierzone. Lider muzyczny jest stewardem repertuaru pieśni zboru.

**Użytkownicy:** Aksel, Edwin, Ruben i kilka dodatkowych osób z Polski. Wszyscy korzystają z tej samej bazy podczas nabożeństw. Brak systemu logowania (celowo — prosta współpraca przez zaufanie).

---

## 2. Stack technologiczny

| Warstwa | Technologia |
|---|---|
| Frontend | Next.js 16 (App Router) + React 19 |
| Styl | Tailwind CSS v4 |
| Backend | Next.js API Routes (serverless) |
| Baza danych | Supabase (PostgreSQL) |
| Hosting | Vercel (auto-deploy z `main`) |
| Język | TypeScript |
| Ikony | Lucide React |

**Zasady architektury:**
- Prosta, płaska struktura folderów
- Minimalna liczba zewnętrznych bibliotek
- Każdy plik powinien mieć jeden, jasny cel

---

## 3. Schemat bazy danych (Supabase / PostgreSQL)

### `collections` — Zbiory pieśni
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
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  author_image TEXT,             -- URL zdjęcia autora
  author_id TEXT,                -- ID autora z SongTreasures
  original_key TEXT,             -- tonacja, np. "G", "Am" — dodana 2026-05
  minor BOOLEAN,                 -- true = mol, false = dur — dodana 2026-05
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, number)
);
```

### `tag_categories` — Kategorie tagów
```sql
CREATE TABLE tag_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `tags` — Tagi
```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES tag_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `song_tags` — Przypisanie tagów do pieśni
```sql
CREATE TABLE song_tags (
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (source IN ('confirmed', 'user', 'ai')),
  -- 'confirmed' = oryginalne (niebieskie)
  -- 'user'      = dodane w aplikacji — do weryfikacji przez Aksela (żółte)
  -- 'ai'        = przypisane przez AI — do weryfikacji (fioletowe, logika niezaimplementowana)
  PRIMARY KEY (song_id, tag_id)
);
```

### `service_types` — Typy nabożeństw
```sql
CREATE TABLE service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `worship_leaders` — Liderzy muzyki
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
  song_order INTEGER,
  added_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Struktura projektu (Next.js)

```
song-steward/
├── app/
│   ├── layout.tsx              # Główny layout, nawigacja dolna (mobile-first)
│   ├── page.tsx                # Dashboard
│   ├── globals.css             # Globalne style + touch-action fix
│   ├── services/
│   │   ├── page.tsx            # Lista nabożeństw
│   │   ├── new/page.tsx        # Tworzenie nabożeństwa
│   │   └── [id]/page.tsx       # Szczegóły: planowanie + prowadzenie na żywo
│   ├── songs/
│   │   ├── page.tsx            # Baza pieśni
│   │   └── [id]/page.tsx       # Szczegóły pieśni (tagi, tonacja, historia)
│   ├── search/
│   │   └── page.tsx            # Wyszukiwanie po tagach
│   ├── settings/
│   │   └── page.tsx            # Konfiguracja słowników
│   └── api/                    # Endpointy REST (songs, services, tags, itp.)
├── components/
│   ├── TagFilter.tsx           # Filtrowanie po tagach (scroll-safe, long-press = wyklucz)
│   ├── SongCard.tsx            # Karta pieśni
│   ├── ServiceSongList.tsx     # Lista pieśni z drag-and-drop (long-press 400ms)
│   └── BottomNav.tsx           # Nawigacja dolna z Lucide icons
├── lib/
│   ├── supabase.ts             # Klient Supabase
│   └── types.ts                # Definicje TypeScript
├── supabase/                   # Migracje SQL (uruchamiane ręcznie w Supabase Dashboard)
│   ├── add_song_tag_source.sql
│   └── add_song_key.sql
├── backups/                    # Backupy bazy (gitignore, JSON)
├── data/                       # Surowe dane z SongTreasures (gitignore)
├── .claude/
│   └── launch.json             # Konfiguracja serwera dev dla Claude Code
└── public/
    └── manifest.json           # PWA manifest
```

---

## 5. Funkcjonalności

### 5.1 Baza pieśni (`/songs`)

- Lista z wyszukiwarką (tytuł, numer, autor)
- Filtrowanie po zbiorze (domyślnie DP)
- Szczegóły pieśni: tonacja (np. "🎵 G dur"), tagi z podziałem na kategorie (zwijane), historia śpiewania
- Edycja tagów z oznaczeniem źródła (confirmed / user / ai)
- Wyniki wyszukiwania sortowane: DP → KM → NDP → NKM → SOS

### 5.2 Wyszukiwanie po tagach (`/search`)

- Zawężanie listy przez klikanie tagów (AND)
- Przytrzymanie tagu (500ms) = wyklucz tag (czerwony)
- Scroll nie wyzwala selekcji tagu
- Pieśń zaplanowana pokazuje ✕ (usuń z nabożeństwa) zamiast wyłączonego 🔖
- Kontekst aktywnego nabożeństwa auto-wykrywany lub przekazywany przez `?service_id=`

### 5.3 Nabożeństwa (`/services`)

- Widok szczegółów: notatka edytowalna inline (klik = tryb edycji, blur = zapis)
- Drag-and-drop kolejności pieśni (długie przytrzymanie 400ms aktywuje drag)
- Pieśni zaplanowane → przycisk ✅ przenosi do zaśpiewanych
- Dodawanie przez wyszukiwarkę lub przycisk "Szukaj po tagach"

### 5.4 Dashboard (`/`)

- Liczba pieśni w bazie
- Ostatnie/najbliższe nabożeństwo
- Top 5 najczęściej śpiewanych (3 miesiące)
- Top 5 rzadko śpiewanych
- Przycisk "+ Nowe nabożeństwo"

### 5.5 Ustawienia (`/settings`)

Pełny CRUD dla: typy nabożeństw, liderzy muzyki, zbiory, kategorie tagów, tagi.

---

## 6. Mobile / PWA

- Instalacja na iOS: Safari → Udostępnij → Dodaj do ekranu głównego
- `viewport-fit=cover` + `env(safe-area-inset-bottom)` — obsługa iPhone z wcięciem
- `touch-action: manipulation` — eliminacja 300ms tap delay na iOS
- `-webkit-tap-highlight-color: transparent` — brak niebieskiego podświetlenia przy tapnięciu
- Micro-animacje: `active:scale-95` na przyciskach, `hover:shadow-md` na kartach

---

## 7. Konfiguracja środowiska

### `.env.local` (lokalny, nigdy nie commitować!)
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

### Vercel
Te same zmienne w: Settings → Environment Variables.

---

## 8. Import danych

Dane pieśni z SongTreasures API. Pliki surowe w `data/` (gitignore).

### Zaimportowane kolekcje

| Skrót | Nazwa | Liczba pieśni |
|-------|-------|--------------|
| DP  | Drogi Pańskie             | ~471 |
| KM  | Kwiat Migdałowy           | ~445 |
| SOS | Sing Our Songs            | ~52  |
| NKM | Kwiat Migdałowy - dodatek | ~10  |
| NDP | Drogi Pańskie - dodatek   | ~55  |

**Łącznie w bazie: 984 pieśni** (stan: maj 2026)

### Skrypty importu
```bash
node data/import-songs.mjs    # kolekcje i pieśni
node data/import-authors.mjs  # autorzy i zdjęcia
node data/import-keys.mjs     # tonacje (original_key, minor)
```

---

## 9. Backup bazy danych

Backupy JSON w folderze `backups/` (gitignore). Tworzenie:
```bash
node --input-type=module << 'EOF'
# (skrypt pobiera wszystkie tabele z paginacją)
EOF
```

Supabase robi automatyczny backup co 24h, ale pobranie niedostępne na planie darmowym.

---

## 10. Proces deploymentu

```
Edycja kodu lokalnie (lub przez Claude Code)
        ↓
npm run dev  →  localhost:3000
        ↓
git commit + git push
        ↓
Vercel buduje i publikuje automatycznie (~1 min)
```

**Uwaga:** Zmiany schematu bazy (nowe kolumny) wymagają ręcznego uruchomienia SQL w Supabase Dashboard przed lub po deploy, zależnie od kompatybilności wstecznej.

---

## 11. Bezpieczeństwo (aktualny stan)

- Brak logowania — dostęp przez URL (zaufani użytkownicy: Aksel, Edwin)
- Supabase RLS wyłączone (MVP)
- Klucz `PUBLISHABLE_KEY` jest publiczny — celowe uproszczenie

W przyszłości: Supabase Auth + RLS.

---

## 12. Przyszłe funkcje

- [ ] **Tekst pieśni** — sekcja "Tekst pieśni" gotowa w UI (placeholder), dane do pozyskania
- [ ] **AI tagging** — kolor fioletowy przygotowany, logika do implementacji
- [ ] Logowanie / konta per lider
- [ ] Statystyki per lider
- [ ] Eksport listy pieśni do PDF
- [ ] Powiadomienia push przed nabożeństwem
- [ ] Import kolekcji norweskiej (174 pieśni) po weryfikacji tytułów
