# Song Steward — Agent Context

> Full human-readable spec: `song-steward-app-spec.md` — read relevant sections for full feature design, schema details, or UI conventions.
> Project rules and workflow: `CLAUDE.md` — read this first.

## What this app is

A PWA for worship song leaders at an evangelical church in Wrocław. Built with Vite + React 19 + TypeScript, TanStack Query, Supabase (PostgreSQL + Auth + RLS), hosted on GitHub Pages. Used by Aksel (primary), Edwin and a few other leaders. The whole app is behind invite-only login (Supabase Auth email OTP — 8-digit code); RLS is on: `authenticated` = full access, `anon` = nothing.

## Stack

- **Frontend:** Vite + React 19 + TypeScript
- **Routing:** react-router-dom with `createHashRouter` (required by GitHub Pages — no exceptions)
- **Styles:** Tailwind CSS v4
- **Cache / queries:** TanStack Query (optimistic UI for all mutations)
- **DB:** Supabase at `https://nnwgazsjtvauweiqjgvk.supabase.co`
- **Icons:** Lucide React only (no emoji in nav/UI components)
- **Validation:** zod (`src/lib/schemas.ts`)
- **Deploy:** push to `main` → GitHub Actions builds + deploys to the root of `gh-pages` (production). Default workflow is committing straight to `main`. Push to `staging` → `gh-pages/staging/` — only for risky changes, when Aksel asks for it.

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
- **Start time** (`start_time`) is required — ask if not given
- **Song status** → `'sung'` (unless Aksel says it was only planned)
- **NHV prefix** = NDP (Drogi Pańskie - dodatek) — not a separate collection

Song lookup: search by `number` + `collection_id` in the `songs` table.

## Database access

RLS is on, so the public anon key gives **no** access without a logged-in session — the old pattern of inserting rows with the publishable key over REST no longer works.

- **Reading (diagnostics):** read-only role `backup_ro` via `SUPABASE_DB_URL_RO` in `.env.local`, run through Docker: `docker run --rm --env PGURL postgres:17-alpine psql "$PGURL" -c '…'`. Pass the connection string only as an env var, never print it.
- **Writing:** the agent has no write access. Schema changes = migration file in `supabase/` that Aksel runs in Supabase Dashboard → SQL Editor. Data changes = through the app, or SQL prepared for Aksel to run.
- **Backup** before every migration: `npm run backup` → `backups/*.sql` (requires Docker Desktop).

Supabase pagination: max 1000 rows per query. For full table exports use `.range(from, from+999)` in a loop.

## Key patterns

### Tag source colors
- `confirmed` → blue (original data from SongTreasures)
- `user` → amber (added via app UI)
- `ai` → purple (AI-assigned — displayed, but nothing creates them yet)

These colors are fixed regardless of theme/accent. Tag edits in the UI go through moderation:
- adding a tag → new row with `source: 'user'`
- removing a `user` tag → row deleted immediately
- removing a `confirmed`/`ai` tag → `pending_removal = true` (struck through), until approved in `/moderation`
- Moderation: approve addition → `source = 'confirmed'`; approve removal → delete row; reject removal → `pending_removal = false`

Tag filtering: include = AND, exclude = NOT.

### Long-press interactions
- **Tag pill:** tap = include, 500ms hold or right-click = exclude (one shared hook: `useLongPress`)
- **Drag-and-drop** (planned/sung lists in Live, @dnd-kit): 400ms hold on touch, 8px on pointer
- Movement >8px cancels long-press (scroll never toggles a tag)

### iOS / mobile
- `viewport-fit=cover` + `env(safe-area-inset-*)` (see `.screen-pad`, `.sheet-body` in `src/index.css`)
- `touch-action: manipulation` eliminates 300ms tap delay
- Min. hit target 48px
- Wake Lock on the Live screen and while SongOverlay is open
- Prefer native browser behavior (caret, scroll-into-view) over custom reimplementations

### Notes (Live screen)
- Tap the preview → full-screen `NotesEditor`
- Autosave (`useNotesAutosave`): debounce 2.5s, max every 10s while typing, retries, flush on close/hide/leave
- Local draft in `localStorage['ss-notes-draft:<serviceId>']`, restored if it never reached the DB

### Theme
- `localStorage['ss-theme']` + `data-theme` on root, default dark. Both themes everywhere.

## Schema: key things to know

- `song_tags.source` CHECK: `'confirmed' | 'user' | 'ai'` (default `'confirmed'`)
- `service_songs.status` CHECK: `'planned' | 'sung'`
- `songs.minor`: `true` = minor key (mol), `false` = major key (dur)
- `songs` has UNIQUE constraint on `(collection_id, number)`
- `tag_categories.user_editable boolean DEFAULT true` — when `false`, tags in that category are read-only: UI blocks add/remove, shows shake animation + `navigator.vibrate(100)` on tap. Currently `false` only for "Tagi SSF" (`611b904a`).
- `song_tags.pending_removal boolean DEFAULT false` — removal awaiting moderation
- `services` has `location_id` (→ `locations`) and `category_id` (→ `service_categories`) — both NOT NULL, ON DELETE RESTRICT
- `services.start_time TIME NOT NULL` — always a full quarter-hour (CHECK); unique index `services_unique_slot (date, start_time, location_id)`
- `worship_leaders.email` — used to match the logged-in user to a leader (`useCurrentUser`); `auth_user_id` exists but the app doesn't use it. Leader without email = guest (no account)
- RPC: `get_top_sung` (dashboard top 5), `get_never_sung` (currently unused) — `supabase/03_rpc.sql`
- Global location filter: `localStorage['ss_location_id']` (`useLocationFilter`, single source of truth); Songs screen filters/sort: `ss-songs-cols`, `ss-songs-inc`, `ss-songs-exc`, `ss-songs-sort`
- `supabase/00_init.sql` is the base DDL only — columns from `02_auth.sql` and `04_service_time.sql` are not in it

## Song overlay

Never navigate to `/songs/:id`. Use `openSong(id, navSongIds, preferredServiceId?)` from `SongOverlayContext`. Every song list passes `navSongIds` so left/right navigation works; pass `preferredServiceId` when opening from a specific service (e.g. Live).

## What NOT to do

- Do not add roles/granular permissions — the model is "logged in = everything"
- Do not log into Aksel's account or ask for the email code; do not create/change/delete production data without explicit consent
- Do not change the production schema except via additive migrations (see `CLAUDE.md`)
- Do not commit `.env.local` or files in `data/` or `backups/`
- Do not add heavy external libraries — keep dependencies minimal
- Do not use emoji in navigation/component UI — use Lucide React icons
- Do not use browser routing — always `createHashRouter` (GitHub Pages requirement)
