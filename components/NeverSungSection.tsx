'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { SlidersHorizontal } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getCached, setCached } from '@/lib/cache'
import TagFilter from '@/components/TagFilter'
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
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [excludedTagIds, setExcludedTagIds] = useState<string[]>([])
  const [modalOpen, setModalOpen] = useState(false)
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
      if (defaultTag) setSelectedTagIds([defaultTag.id])
      setLoading(false)
    }
    init()
  }, [])

  const unsungSongs = useMemo(() => {
    return allSongs
      .filter((song) => {
        const tagIds = song.song_tags?.map((st) => st.tag_id) || []
        if (selectedTagIds.length > 0 && !selectedTagIds.every((id) => tagIds.includes(id))) return false
        if (excludedTagIds.some((id) => tagIds.includes(id))) return false
        return !sungIds.has(song.id)
      })
      .slice(0, 5)
  }, [allSongs, sungIds, selectedTagIds, excludedTagIds])

  // Skrócony opis aktywnych filtrów
  const filterLabel = useMemo(() => {
    const sel = selectedTagIds.map((id) => allTags.find((t) => t.id === id)?.name).filter(Boolean)
    const excl = excludedTagIds.map((id) => allTags.find((t) => t.id === id)?.name).filter(Boolean)
    const parts = [
      ...sel.map((n) => n),
      ...excl.map((n) => `bez: ${n}`),
    ]
    return parts.length > 0 ? parts.join(' · ') : 'Wszystkie'
  }, [selectedTagIds, excludedTagIds, allTags])

  if (loading) {
    return <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-24 animate-pulse" />
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        {/* Nagłówek z przyciskiem filtra */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-gray-700">🌱 Jeszcze nie śpiewane</h2>
          <button
            onClick={() => setModalOpen(true)}
            className="text-gray-400 hover:text-blue-900 transition-colors p-1 -mr-1 active:scale-95"
            title="Zmień filtry"
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>

        {/* Aktywne filtry jako tekst */}
        <p className="text-xs text-gray-400 mb-3">{filterLabel}</p>

        {/* Lista pieśni */}
        {unsungSongs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-1">Wszystkie zaśpiewane 🎉</p>
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

      {/* Modal z filtrami */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full bg-white rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Filtruj tagi</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="bg-blue-900 text-white rounded-xl px-4 py-2 text-sm font-medium active:scale-95 transition-all"
              >
                Gotowe
              </button>
            </div>
            <TagFilter
              availableTags={allTags}
              selectedTagIds={selectedTagIds}
              excludedTagIds={excludedTagIds}
              onToggleTag={(id) => {
                setExcludedTagIds((prev) => prev.filter((x) => x !== id))
                setSelectedTagIds((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                )
              }}
              onToggleExclude={(id) => {
                setSelectedTagIds((prev) => prev.filter((x) => x !== id))
                setExcludedTagIds((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                )
              }}
              onClear={() => { setSelectedTagIds([]); setExcludedTagIds([]) }}
              categories={categories}
            />
          </div>
        </div>
      )}
    </>
  )
}
