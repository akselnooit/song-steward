-- ============================================================
-- Song Steward — canonical schema
-- ============================================================
-- DOCUMENTATION ONLY — tables already exist in production.
-- Run this only when recreating the database from scratch.
-- This file reflects the full current schema including all
-- migrations applied to date.
--
-- SCHEMA (DDL) ONLY. Reference/seed data — locations, service_categories,
-- and the "Tagi SSF" user_editable=false lock — is NOT here; restore it
-- from a database backup (see backups/) after recreating from scratch.
-- ============================================================

-- Zbiory pieśni
CREATE TABLE collections (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  short_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pieśni
CREATE TABLE songs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  number        INTEGER NOT NULL,
  title         TEXT NOT NULL,
  author        TEXT,
  author_image  TEXT,           -- URL zdjęcia autora (z SongTreasures)
  author_id     TEXT,           -- ID autora z SongTreasures
  original_key  TEXT,           -- tonacja, np. "G", "Am"
  minor         BOOLEAN,        -- true = mol, false = dur
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (collection_id, number)
);

-- Kategorie tagów
CREATE TABLE tag_categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL UNIQUE,
  user_editable BOOLEAN NOT NULL DEFAULT true,
  -- false = tagi tylko do odczytu; UI blokuje dodawanie/usuwanie
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Tagi
CREATE TABLE tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES tag_categories(id) ON DELETE SET NULL,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Przypisanie tagów do pieśni
CREATE TABLE song_tags (
  song_id         UUID REFERENCES songs(id) ON DELETE CASCADE,
  tag_id          UUID REFERENCES tags(id) ON DELETE CASCADE,
  source          TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (source IN ('confirmed', 'user', 'ai')),
  -- 'confirmed' = oryginalne dane z SongTreasures (niebieskie w UI)
  -- 'user'      = dodane ręcznie w aplikacji (żółte w UI)
  -- 'ai'        = przypisane przez AI — logika niezaimplementowana (fioletowe w UI)
  pending_removal BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (song_id, tag_id)
);

-- Lokalizacje nabożeństw
CREATE TABLE locations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kategorie nabożeństw
CREATE TABLE service_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Liderzy muzyki
CREATE TABLE worship_leaders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nabożeństwa
CREATE TABLE services (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id       UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  category_id       UUID NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
  worship_leader_id UUID REFERENCES worship_leaders(id) ON DELETE SET NULL,
  date              DATE NOT NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Pieśni na nabożeństwie
CREATE TABLE service_songs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  song_id    UUID REFERENCES songs(id) ON DELETE CASCADE,
  status     TEXT NOT NULL CHECK (status IN ('planned', 'sung')),
  song_order INTEGER,
  added_at   TIMESTAMPTZ DEFAULT NOW()
);
