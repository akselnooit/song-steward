<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Song Steward — Agent Context

> Full human-readable spec: `song-steward-app-spec.md` — read relevant sections for full feature design, schema details, or UI conventions.

## What this app is

A PWA for worship song leaders at an evangelical church in Wrocław. Currently used by **Aksel** (primary) and **Edwin** on a single shared database with no login. **More worship leaders are being onboarded soon — login (Supabase Auth) + RLS are planned and will be needed shortly.** Built with Next.js 16 (App Router), Tailwind CSS v4, Supabase (PostgreSQL), hosted on Vercel.

## Stack

- **Frontend:** Next.js 16 App Router + React 19 + TypeScript
- **Styles:** Tailwind CSS v4 (`@import "tailwindcss"` in globals.css — no `tailwind.config`)
- **Backend:** Next.js API Routes in `app/api/`
- **DB:** Supabase at `https://nnwgazsjtvauweiqjgvk.supabase.co`
- **Icons:** Lucide React only (no emoji in nav/UI components)
- **Deploy:** `git push origin main` → Vercel auto-builds (~1 min)

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
- **Tag exclude** (TagFilter): 500ms hold → red strikethrough exclusion
- **Drag-and-drop** (ServiceSongList): 400ms hold → activates drag, vibrates 30ms
- Scroll cancels both — tracked via 8px movement threshold on `touchStart`

### iOS / mobile
- `viewport-fit=cover` + `env(safe-area-inset-bottom)` for iPhone notch
- `touch-action: manipulation` eliminates 300ms tap delay
- Bottom nav has `pb-[env(safe-area-inset-bottom)]`
- Main content has `pb-[calc(5rem+env(safe-area-inset-bottom))]`

### Notes inline editing
- Click static text → textarea opens (6 rows, autoFocus)
- `onBlur` or Escape → saves via PATCH `/api/services/:id`

## Schema: key things to know

- `song_tags.source` CHECK: `'confirmed' | 'user' | 'ai'` (default `'confirmed'`)
- `service_songs.status` CHECK: `'planned' | 'sung'`
- `songs.minor`: `true` = minor key (mol), `false` = major key (dur)
- `songs` has UNIQUE constraint on `(collection_id, number)`
- `tag_categories.user_editable boolean DEFAULT true` — when `false`, tags in that category are read-only: UI blocks add/remove, shows shake animation + `navigator.vibrate(100)` on tap. Currently `false` only for "Tagi SSF" (`611b904a-f262-4a25-9f6e-f4d64552cf62`).
- `services` has `location_id` (→ `locations`) and `category_id` (→ `service_categories`) — both NOT NULL; `service_types` table no longer exists
- `locations` and `service_categories` managed via `/api/locations` and `/api/service-categories`
- Global location filter stored as cookie `ss_location_id`; dashboard filters stored in localStorage (`ss_top_sung_filters`, `ss_never_sung_filters`)
- All FKs use ON DELETE CASCADE or SET NULL (see spec for details)
- RLS is disabled (MVP) — no auth required *yet*. Auth + RLS are planned (more users coming soon); design new tables/columns so RLS can be enabled later without rework.

## File structure highlights

```
app/api/          — REST endpoints (songs, services, tags, service-songs, etc.)
app/services/[id] — Service detail: live worship view, planned/sung lists, notes
app/songs/[id]    — Song detail: key, tags by category (collapsible), sing history
app/search/       — Tag-based search with active service integration
components/
  TagFilter.tsx        — scroll-safe tag buttons, long-press excludes
  ServiceSongList.tsx  — drag-and-drop reorder (long-press 400ms)
  SongCard.tsx         — song tile used in search results
  BottomNav.tsx        — bottom navigation with Lucide icons
lib/
  supabase.ts          — Supabase client
  types.ts             — TypeScript interfaces matching DB schema
  useGlobalLocation.ts — cookie-based global location filter hook (client)
  locationCookie.ts    — server-side cookie reader for location filter
  useFilters.ts        — localStorage hooks for TopSung/NeverSung dashboard filters
scripts/         — one-off data migration scripts (e.g. migrate_service_types.mjs)
supabase/        — SQL migration files (run manually in Supabase Dashboard)
backups/         — JSON database backups (gitignored)
data/            — Raw import scripts and SongTreasures source data (gitignored)
```

## Deployment

```
npm run dev          → localhost:3000
git push origin main → Vercel auto-deploys (~1 min)
```

Schema changes (new columns) must be run manually in Supabase Dashboard SQL editor — migrations in `supabase/*.sql` for reference.

## What NOT to do

- Do not add auth/login *unprompted* — it's planned (more users coming soon) but only build it when Aksel asks
- Do not enable Supabase RLS yet — off intentionally until auth lands; don't flip it on without coordinating the auth work
- Do not commit `.env.local`, files in `data/`, or files in `backups/`
- Do not add heavy external libraries — keep dependencies minimal
- Do not use emoji in navigation/component UI — use Lucide React icons

## Performance

App runs on low-end phones during live worship. Avoid unnecessary API calls on load. Data that rarely changes (e.g. author list) lives as a static file in `lib/`, not as an endpoint.

## Song overlay

Never navigate to `/songs/[id]`. Use `openSong()` from `SongOverlayContext`. Every song list passes `navSongIds` so arrow navigation works.

## Before pushing

Run `npx tsc --noEmit` and fix all errors before pushing — TypeScript errors block the Vercel build.
