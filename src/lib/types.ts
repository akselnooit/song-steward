// ── Base DB types ────────────────────────────────────────────────

export interface Collection {
  id: string
  name: string
  short_name: string
}

export interface Song {
  id: string
  collection_id: string
  number: number
  title: string
  author: string | null
  author_image: string | null
  original_key: string | null
  minor: boolean | null
}

export interface TagCategory {
  id: string
  name: string
  user_editable: boolean
}

export interface Tag {
  id: string
  category_id: string | null
  name: string
  description: string | null
}

export interface SongTag {
  song_id: string
  tag_id: string
  source: 'confirmed' | 'user' | 'ai'
  pending_removal: boolean
}

export interface Location {
  id: string
  name: string
}

export interface ServiceCategory {
  id: string
  name: string
}

export interface WorshipLeader {
  id: string
  name: string
  auth_user_id: string | null
  email: string | null
}

export interface Service {
  id: string
  location_id: string
  category_id: string
  worship_leader_id: string | null
  date: string
  notes: string | null
}

export interface ServiceSong {
  id: string
  service_id: string
  song_id: string
  status: 'planned' | 'sung'
  song_order: number | null
  added_at: string
}

// ── Joined / enriched types ──────────────────────────────────────

export interface SongWithCollection extends Song {
  collection: Collection
}

export interface SongTagWithTag extends SongTag {
  tag: Tag
}

export interface SongDetail extends SongWithCollection {
  song_tags: SongTagWithTag[]
}

export interface ServiceWithRefs extends Service {
  location: Location
  category: ServiceCategory
  leader: WorshipLeader | null
}

export interface ServiceSongWithSong extends ServiceSong {
  song: SongWithCollection
}

// ── RPC return types ─────────────────────────────────────────────

export interface TopSungRow {
  id: string
  collection_short_name: string
  number: number
  title: string
  author: string | null
  original_key: string | null
  minor: boolean | null
  sung_count: number
}

export interface NeverSungRow {
  id: string
  collection_short_name: string
  number: number
  title: string
  author: string | null
  original_key: string | null
  minor: boolean | null
}

export interface StatsFilters {
  locationId?: string
  leaderId?: string
  months?: number
  tagIdsInclude?: string[]
  tagIdsExclude?: string[]
}
