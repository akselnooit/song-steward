# Song Steward — Agent Context

> Full human-readable spec: `song-steward-app-spec.md` — read relevant sections for full feature design, schema details, or UI conventions.
> Project rules and workflow: `CLAUDE.md` — read this first.

## What this app is

A PWA for worship song leaders at an evangelical church in Wrocław. Built with Vite + React 19 + TypeScript, TanStack Query, Supabase (PostgreSQL + Auth), hosted on GitHub Pages. Currently used by Aksel (primary), Edwin, and a few others. Login (Supabase Auth magic-link) + RLS are planned and will be needed soon as more users are added.

## Stack

- **Frontend:** Vite + React 19 + TypeScript
- **Routing:** react-router-dom with `createHashRouter` (required by GitHub Pages — no exceptions)
- **Styles:** Tailwind CSS v4
- **Cache / queries:** TanStack Query (optimistic UI for all mutations)
- **DB:** Supabase at `https://nnwgazsjtvauweiqjgvk.supabase.co`
- **Icons:** Lucide React only (no emoji in nav/UI components)
- **Deploy:** push to `staging` → GitHub Actions builds + deploys to `gh-pages/staging/` (~1 min); push to `main` → deploys to root of `gh-pages`

## Database constant IDs

These IDs are stable — use them directly in scripts and data entry.

### Collections

| Short | Name | ID |
|-------|------|----|
| DP  | Drogi Pańskie             | `d26b6088-f544-4359-bc4c-e14ddc7f2dcb` |
| KM  | Kwiat Migdałowy           | `6229579a-66d2-4a72-aadf-1997e866d108` |
| NDP | Drogi Pańskie - dodatek   | `c6add22b-8340-47ca-8bf8-8b293f65d500` |
| NKM | Kwiat Migdałowy - dodatek | `2a32a3fb-8a2c-4429-b10f-36e7f3213f55` |
| SOS | Sing Our Songs            | `0f13dd2f-fd58-4d6f-b2e4-79d9200be519` |

### Locations

| Name | ID |
|------|----|
| Wrocław  | `a78b5a31-3653-4bdc-a7eb-e47820f94528` |
| Ustroń   | `ee93b93a-b1ff-49cc-ba85-03fa9650ee96` |
| Brunstad | `58012fc7-ff5c-40c0-95e0-e71c062cac03` |
| Ukraina  | `e585d8cb-a3da-467d-9928-a8daad4c0911` |

### Service categories

| Name | ID |
|------|----|
| Ogólne          | `25bea1bb-a732-4af3-b1f6-c8ce5b660dd6` |
| Środowe         | `32040e20-bacf-4b40-ba80-144a0389e99b` |
| Młodzieżowe     | `cebe3a0e-89c5-48ee-8ae3-33d571f46922` |
| Braterskie      | `fd1b0c48-90cd-4370-a98c-e3af1bf0c012` |
| Magasinet       | `d342f6c6-9bcc-4a06-bdfd-8129fc420530` |
| Próba orkiestry | `65fa3d07-8f20-4794-8bcf-8a90c0cd1f46` |

### Worship leaders

| Name | ID |
|------|----|
| Aksel Nooitgedagt | `f9083fb3-d892-43c8-aceb-2185d0117347` |
| Edwin Nooitgedagt | `049de4ba-b99b-4a4b-8828-02a7b66b90d4` |
| Ruben Miedziak    | `bcea2d8b-e084-498a-a25f-b707dfde511b` |
| Torstein Skutle   | `39c24b59-4431-4243-b838-c1e6442f5bb7` |

### Tag categories

| Name | ID |
|------|----|
| 🎤 Charakter  | `0f5d39c4-38f1-4781-a6a1-5b526f8c3d11` |
| 🎯 Okazja     | `13017e82-63eb-4f33-8671-bf5a574c6e25` |
| 🎶 Melodia    | `b110b0e8-f59c-49b9-93a5-98e36139eb92` |
| 📖 Tematyka   | `e33b9451-f22a-4cda-8e9b-eca621dbf3dd` |
| Tagi SSF      | `611b904a-f262-4a25-9f6e-f4d64552cf62` | ← `user_editable = false` |

## Data entry conventions

When Aksel provides service data without explicit values, use these defaults:
- **No collection prefix on song number** → DP (Drogi Pańskie)
- **No worship leader specified** → Aksel Nooitgedagt
- **No location specified** → Wrocław (`a78b5a31`) + Ogólne (`25bea1bb`)
- **Song status** → `'sung'` (unless Aksel says it was only planned)
- **NHV prefix** = NDP (Drogi Pańskie - dodatek) — not a separate collection

Song lookup: search by `number` + `collection_id` in the `songs` table.

## Supabase direct API (for scripts)

```js
const url = 'https://nnwgazsjtvauweiqjgvk.supabase.co'
const key = 'sb_publishable_PaQe3v3Nkcuaj_I96tY4gw_6a_3cJyS'  // public key, intentional
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }

// Example: insert a service
await fetch(`${url}/rest/v1/services`, {
  method: 'POST',
  headers: { ...headers, Prefer: 'return=representation' },
  body: JSON.stringify({ date: '2026-01-20', location_id: '...', category_id: '...', worship_leader_id: '...' })
})
```

For inline scripts use: `node --input-type=module << 'EOF' ... EOF`

Supabase pagination: max 1000 rows per query. For full table exports use `.range(from, from+999)` in a loop.

## Key patterns

### Tag source colors
- `confirmed` → blue (original data from SongTreasures)
- `user` → amber (added via app UI)
- `ai` → purple (AI-assigned, logic not yet implemented)

New tags added via UI always get `source: 'user'`.

### Long-press interactions
- **Tag exclude** (TagPill): 500ms hold → red strikethrough exclusion
- **Drag-and-drop** (service song list in Live): 400ms hold → activates drag, vibrates 30ms
- Scroll cancels both — tracked via 8px movement threshold on `touchStart`

### iOS / mobile
- `viewport-fit=cover` + `env(safe-area-inset-bottom)` for iPhone notch
- `touch-action: manipulation` eliminates 300ms tap delay
- Bottom nav has `pb-[env(safe-area-inset-bottom)]`
- Main content has `pb-[calc(5rem+env(safe-area-inset-bottom))]`

### Notes inline editing (Live screen)
- Click static text → textarea opens (6 rows, autoFocus)
- `onBlur` or Escape → saves via Supabase mutation

## Schema: key things to know

- `song_tags.source` CHECK: `'confirmed' | 'user' | 'ai'` (default `'confirmed'`)
- `service_songs.status` CHECK: `'planned' | 'sung'`
- `songs.minor`: `true` = minor key (mol), `false` = major key (dur)
- `songs` has UNIQUE constraint on `(collection_id, number)`
- `tag_categories.user_editable boolean DEFAULT true` — when `false`, tags in that category are read-only: UI blocks add/remove, shows shake animation + `navigator.vibrate(100)` on tap. Currently `false` only for "Tagi SSF" (`611b904a`).
- `services` has `location_id` (→ `locations`) and `category_id` (→ `service_categories`) — both NOT NULL
- Global location filter stored in localStorage (`ss-location`); stats filters in localStorage (`ss-stats-filters`)
- All FKs use ON DELETE CASCADE or SET NULL

## Song overlay

Never navigate to `/songs/:id`. Use `openSong(id, navSongIds)` from `SongOverlayContext`. Every song list passes `navSongIds` so left/right button navigation works.

## What NOT to do

- Do not add auth/login *unprompted* — it's planned but only build it when Aksel asks
- Do not enable Supabase RLS yet — off intentionally until auth lands
- Do not commit `.env.local` or files in `data/` or `backups/`
- Do not add heavy external libraries — keep dependencies minimal
- Do not use emoji in navigation/component UI — use Lucide React icons
- Do not use browser routing — always `createHashRouter` (GitHub Pages requirement)
