# Song Steward

A mobile-first PWA for worship song leaders at an evangelical church in Poland. Manage the song repertoire, plan and record songs at services, and search by tags in real time — including live during a service on your phone.

The name comes from the biblical concept of *stewardship* — the worship leader is a steward of the congregation's song repertoire.

## Features

- **Song database** — 984 songs across 5 collections (Drogi Pańskie, Kwiat Migdałowy, and more), with tonality, tags, and sing history per song
- **Tag search** — filter songs by multiple tags (AND logic), long-press to exclude a tag; designed for quick lookup mid-service
- **Service planning** — plan songs for an upcoming service, then mark them as sung live; drag-and-drop reorder
- **Dashboard** — most/least recently sung songs, quick access to the next service
- **PWA** — installable on iPhone via Safari; works with iOS safe area, no tap delay

## Stack

Vite · React 19 · TypeScript · Tailwind CSS v4 · TanStack Query · Supabase (PostgreSQL) · GitHub Pages

## Documentation

- **[Full specification](song-steward-app-spec.md)** — architecture, database schema, features, deployment process
- **[Agent context](AGENTS.md)** — constant IDs, conventions, and patterns for AI coding assistants
