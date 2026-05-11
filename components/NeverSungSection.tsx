'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getCached, setCached } from '@/lib/cache'
import type { Tag, TagCategory } from '@/lib/types'

type SongWithTags = {
  id: string
  title: string
  number: number
  collection?: { short_name: string }
  song_tags?: { tag_id: string }[]
}

const DEFAULT_TAG_NAME = '🎯 Rozpoczęcie'

export default function NeverSungSection() {
  const [allSongs, setAllSongs] = useState<SongWithTags[]>([])
  const [allTags, setAllTags] = useState<(Tag & { category?: TagCategory })[]>([])
  const [categories, setCategories] = useState<TagCategory[]>([])
  const [sungIds, setSungIds] = useState<Set<string>>(new Set())
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const [songsData, tagsData, catsData, sungData] = await Promise.all([
        getCached<SongWithTags[]>('songs_all') ??
          fetch('/api/songs').then((r) => r.json()).then((d) => { setCached('songs_all', d); return d }),
        getCached<Tag[]>('tags_all') ??
          fetch('/api/tags').then((r) => r.json()).then((d) => { setCached('tags_all', d); return d }),
        getCached<TagCategory[]>('tag_categories_all') ??
          fetch('/api/tag-categories').then((r) => r.json()).then((d) => { setCached('tag_categories_all', d); return d }),
        supabase.from('service_songs').select('song_id').eq('status', 'sung'),
      ])

      setAllSongs(songsData)
      setAllTags(tagsData)
      setCategories(catsData)
      setSungIds(new Set((sungData.data || []).map((s) => s.song_id)))

      const defaultTag = tagsData.find((t: Tag) => t.name === DEFAULT_TAG_NAME)
      setSelectedTagId(defaultTag?.id ?? tagsData[0]?.id ?? null)
      setLoading(false)
    }
    init()
  }, [])

  const unsungSongs = useMemo(() => {
    if (!selectedTagId) return []
    return allSongs
      .filter((song) => {
        const tagIds = song.song_tags?.map((st) => st.tag_id) || []
        return tagIds.includes(selectedTagId) && !sungIds.has(song.id)
      })
      .slice(0, 5)
  }, [allSongs, sungIds, selectedTagId])

  const tagsByCategory = useMemo(() => {
    return categories.reduce<Record<string, (Tag & { category?: TagCategory })[]>>((acc, cat) => {
      const tags = allTags.filter((t) => t.category_id === cat.id)
      if (tags.length > 0) acc[cat.id] = tags
      return acc
    }, {})
  }, [allTags, categories])

  if (loading) {
    return <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-32 animate-pulse" />
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <h2 className="font-semibold text-gray-700 mb-3">🌱 Jeszcze nie śpiewane</h2>

      {/* Selektor tagu — taki sam styl jak na /search */}
      <div className="space-y-2 mb-4">
        {categories.map((cat) => {
          const tags = tagsByCategory[cat.id]
          if (!tags || tags.length === 0) return null
          return (
            <div key={cat.id}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{cat.name}</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTagId(tag.id)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all active:scale-95 ${
                      tag.id === selectedTagId
                        ? 'bg-blue-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Lista pieśni */}
      {unsungSongs.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-2">Wszystkie zaśpiewane 🎉</p>
      ) : (
        <ol className="space-y-2">
          {unsungSongs.map((song, i) => (
            <li key={song.id} className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 w-5 shrink-0">{i + 1}.</span>
              <Link
                href={`/songs/${song.id}`}
                className="flex-1 text-sm text-gray-900 hover:text-blue-900 line-clamp-1"
              >
                <span className="font-semibold text-gray-500 mr-1">{song.number}</span>
                {song.title}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
