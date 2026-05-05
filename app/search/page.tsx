'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import TagFilter from '@/components/TagFilter'
import SongCard from '@/components/SongCard'
import { Song, Tag, TagCategory } from '@/lib/types'

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  // Kontekst aktywnego nabożeństwa (przekazany przez /services/[id])
  const serviceId = searchParams.get('service_id') || ''

  const [allTags, setAllTags] = useState<(Tag & { category?: TagCategory })[]>([])
  const [categories, setCategories] = useState<TagCategory[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  // Pobierz tagi i kategorie
  useEffect(() => {
    Promise.all([
      fetch('/api/tags').then((r) => r.json()),
      fetch('/api/tag-categories').then((r) => r.json()),
    ]).then(([tagsData, catsData]) => {
      setAllTags(tagsData)
      setCategories(catsData)
    })
  }, [])

  // Pobierz pieśni na podstawie wybranych tagów
  const fetchSongs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    selectedTagIds.forEach((id) => params.append('tag_id', id))
    const res = await fetch(`/api/songs?${params}`)
    const data = await res.json()
    setSongs(data)
    setLoading(false)
  }, [selectedTagIds])

  useEffect(() => {
    fetchSongs()
  }, [fetchSongs])

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  // Tagi dostępne w aktualnie wyfiltrowanych pieśniach (dla zawężania)
  const availableTagIds = new Set(
    songs.flatMap((song) =>
      (song as Song & { song_tags?: { tag_id: string }[] }).song_tags?.map((st) => st.tag_id) || []
    )
  )
  // Zawsze pokaż aktywne tagi + tagi w wynikach
  const displayTags = allTags.filter(
    (t) => selectedTagIds.includes(t.id) || availableTagIds.has(t.id)
  )

  // Dodaj pieśń do aktywnego nabożeństwa jako "sung"
  const addToService = async (song: Song) => {
    if (!serviceId || addingId) return
    setAddingId(song.id)
    await fetch('/api/service-songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_id: serviceId, song_id: song.id, status: 'sung' }),
    })
    setAddedIds((prev) => new Set([...prev, song.id]))
    setAddingId(null)
  }

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-blue-900">🔖 Szukaj po tagach</h1>
        {serviceId && (
          <button
            onClick={() => router.push(`/services/${serviceId}`)}
            className="text-sm text-blue-900 underline"
          >
            ← Nabożeństwo
          </button>
        )}
      </div>

      {/* Filtr tagów */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <TagFilter
          availableTags={displayTags}
          selectedTagIds={selectedTagIds}
          onToggleTag={toggleTag}
          onClear={() => setSelectedTagIds([])}
          categories={categories}
        />
      </div>

      {/* Wyniki */}
      <div className="mb-2 text-sm text-gray-500">
        {loading ? 'Ładowanie...' : `Znaleziono ${songs.length} pieśni`}
      </div>

      {!loading && songs.length === 0 && selectedTagIds.length > 0 && (
        <p className="text-center text-gray-400 py-8">Brak pieśni spełniających wszystkie filtry</p>
      )}

      {!loading && songs.length === 0 && selectedTagIds.length === 0 && (
        <p className="text-center text-gray-400 py-8">Wybierz tagi, aby zobaczyć pieśni</p>
      )}

      <div className="space-y-2">
        {songs.map((song) => (
          <SongCard
            key={song.id}
            song={song}
            action={
              serviceId
                ? {
                    label: addedIds.has(song.id) ? '✓' : '＋',
                    onClick: addedIds.has(song.id) ? () => {} : addToService,
                  }
                : undefined
            }
          />
        ))}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">Ładowanie...</div>}>
      <SearchContent />
    </Suspense>
  )
}
