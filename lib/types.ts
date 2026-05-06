// Typy TypeScript odpowiadające schematowi bazy danych

export interface Collection {
  id: string
  name: string
  short_name: string
  created_at: string
}

export interface Song {
  id: string
  collection_id: string | null
  number: number
  title: string
  author: string | null
  author_image: string | null
  author_id: string | null
  created_at: string
  // dołączane przez JOIN
  collection?: Collection
  tags?: Tag[]
}

export interface TagCategory {
  id: string
  name: string
  created_at: string
}

export interface Tag {
  id: string
  category_id: string | null
  name: string
  description: string | null
  created_at: string
  // dołączane przez JOIN
  category?: TagCategory
}

export interface SongTag {
  song_id: string
  tag_id: string
}

export interface ServiceType {
  id: string
  name: string
  created_at: string
}

export interface WorshipLeader {
  id: string
  name: string
  created_at: string
}

export interface Service {
  id: string
  service_type_id: string | null
  worship_leader_id: string | null
  date: string
  notes: string | null
  created_at: string
  // dołączane przez JOIN
  service_type?: ServiceType
  worship_leader?: WorshipLeader
  service_songs?: ServiceSong[]
}

export interface ServiceSong {
  id: string
  service_id: string
  song_id: string
  status: 'planned' | 'sung'
  song_order: number | null
  added_at: string
  // dołączane przez JOIN
  song?: Song
}
