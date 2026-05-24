'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import TagFilter from '@/components/TagFilter'
import SongCard from '@/components/SongCard'
import { Song, Tag, TagCategory } from '@/lib/types'
import { fetcher } from '@/lib/fetcher'
import { cacheGet, cacheSet } from '@/lib/cache'

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const serviceIdParam = searchParams.get('service_id') || ''

  const [serviceId, setServiceId] = useState(serviceIdParam)
  const [serviceName, setServiceName] = useState<string | null>(null)
  // songId → status już w nabożeństwie (z serwera) lub dodany w tej sesji
  const [serviceStatusMap, setServiceStatusMap] = useState<Record<string, 'planned' | 'sung'>>({})
  // songId → id rekordu service_songs (potrzebne do usuwania)
  const [serviceSongIdMap, setServiceSongIdMap] = useState<Record<string, string>>({})
  // Tagi w URL — przeżywają nawigację tam i z powrotem
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(() => searchParams.getAll('tag'))
  const [excludedTagIds, setExcludedTagIds] = useState<string[]>(() => searchParams.getAll('excl'))
  const [addingId, setAddingId] = useState<string | null>(null)

  // Pobierz aktywne nabożeństwo jeśli brak service_id w URL
  useEffect(() => {
    if (serviceIdParam) return
    fetch('/api/services?active=1')
      .then((r) => r.json())
      .then((data) => {
        if (data?.id) {
          setServiceId(data.id)
          const typeName = data.service_type?.name || ''
          const dateStr = new Date(data.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })
          setServiceName(`${dateStr}${typeName ? ` – ${typeName}` : ''}`)
        }
      })
      .catch(() => {})
  }, [serviceIdParam])

  // Pobierz pieśni już w nabożeństwie gdy serviceId jest znany
  useEffect(() => {
    if (!serviceId) return
    fetch(`/api/services/${serviceId}`)
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, 'planned' | 'sung'> = {}
        const idMap: Record<string, string> = {}
        for (const ss of data?.service_songs || []) {
          map[ss.song_id] = ss.status
          idMap[ss.song_id] = ss.id
        }
        setServiceStatusMap(map)
        setServiceSongIdMap(idMap)
        if (!serviceName && data?.date) {
          const typeName = data.service_type?.name || ''
          const dateStr = new Date(data.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })
          setServiceName(`${dateStr}${typeName ? ` – ${typeName}` : ''}`)
        }
      })
      .catch(() => {})
  }, [serviceId])

  // Tagi i kategorie: SWR + localStorage (TTL 10 min)
  const { data: allTags = [] } = useSWR<(Tag & { category?: TagCategory })[]>('/api/tags', fetcher, {
    fallbackData: cacheGet('/api/tags') ?? undefined,
    onSuccess: (data) => cacheSet('/api/tags', data),
    revalidateOnFocus: false,
  })
  const { data: categories = [] } = useSWR<TagCategory[]>('/api/tag-categories', fetcher, {
    fallbackData: cacheGet('/api/tag-categories') ?? undefined,
    onSuccess: (data) => cacheSet('/api/tag-categories', data),
    revalidateOnFocus: false,
  })

  // Pieśni: SWR (pamięć) z keepPreviousData — lista nie znika przy zmianie tagów
  const songParams = new URLSearchParams()
  selectedTagIds.forEach((id) => songParams.append('tag_id', id))
  const { data: songs = [], isLoading: loading } = useSWR<Song[]>(
    `/api/songs?${songParams}`,
    fetcher,
    { keepPreviousData: true, revalidateOnFocus: false }
  )

  const updateUrl = (selected: string[], excluded: string[]) => {
    const params = new URLSearchParams()
    if (serviceIdParam) params.set('service_id', serviceIdParam)
    selected.forEach((id) => params.append('tag', id))
    excluded.forEach((id) => params.append('excl', id))
    const qs = params.toString()
    router.replace(`/search${qs ? `?${qs}` : ''}`, { scroll: false } as Parameters<typeof router.replace>[1])
  }

  const toggleTag = (tagId: string) => {
    const newExcluded = excludedTagIds.filter((id) => id !== tagId)
    const newSelected = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId]
    setExcludedTagIds(newExcluded)
    setSelectedTagIds(newSelected)
    updateUrl(newSelected, newExcluded)
  }

  const toggleExclude = (tagId: string) => {
    const newSelected = selectedTagIds.filter((id) => id !== tagId)
    const newExcluded = excludedTagIds.includes(tagId)
      ? excludedTagIds.filter((id) => id !== tagId)
      : [...excludedTagIds, tagId]
    setSelectedTagIds(newSelected)
    setExcludedTagIds(newExcluded)
    updateUrl(newSelected, newExcluded)
  }

  const availableTagIds = new Set(
    songs.flatMap((song) =>
      (song as Song & { song_tags?: { tag_id: string }[] }).song_tags?.map((st) => st.tag_id) || []
    )
  )
  const displayTags = allTags.filter(
    (t) => selectedTagIds.includes(t.id) || excludedTagIds.includes(t.id) || availableTagIds.has(t.id)
  )

  const visibleSongs = songs.filter((song) => {
    if (excludedTagIds.length === 0) return true
    const songTagIds = (song as Song & { song_tags?: { tag_id: string }[] }).song_tags?.map((st) => st.tag_id) || []
    return !excludedTagIds.some((excId) => songTagIds.includes(excId))
  })

  const addToService = async (song: Song, status: 'planned' | 'sung') => {
    if (!serviceId || addingId) return
    setAddingId(song.id)
    const res = await fetch('/api/service-songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_id: serviceId, song_id: song.id, status }),
    })
    const data = await res.json()
    if (data?.id) setServiceSongIdMap((prev) => ({ ...prev, [song.id]: data.id }))
    setServiceStatusMap((prev) => ({ ...prev, [song.id]: status }))
    setAddingId(null)
  }

  const removeFromService = async (song: Song) => {
    const ssId = serviceSongIdMap[song.id]
    if (!ssId || addingId) return
    setAddingId(song.id)
    await fetch(`/api/service-songs/${ssId}`, { method: 'DELETE' })
    setServiceStatusMap((prev) => { const next = { ...prev }; delete next[song.id]; return next })
    setServiceSongIdMap((prev) => { const next = { ...prev }; delete next[song.id]; return next })
    setAddingId(null)
  }

  const hasFilters = selectedTagIds.length > 0 || excludedTagIds.length > 0

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-blue-900">Szukaj po tagach</h1>
        {serviceIdParam && (
          <button onClick={() => router.push(`/services/${serviceIdParam}`)} className="text-sm text-blue-900 underline">
            ← Nabożeństwo
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <TagFilter
          availableTags={displayTags}
          selectedTagIds={selectedTagIds}
          excludedTagIds={excludedTagIds}
          onToggleTag={toggleTag}
          onToggleExclude={toggleExclude}
          onClear={() => { setSelectedTagIds([]); setExcludedTagIds([]); updateUrl([], []) }}
          categories={categories}
        />
      </div>

      {serviceId && serviceName && (
        <div className="mb-3 px-3 py-2 bg-blue-50 rounded-xl text-sm text-blue-800">
          Dodajesz do: <span className="font-semibold">{serviceName}</span>
        </div>
      )}

      <div className="mb-2 text-sm text-gray-500">
        {!loading && `Znaleziono ${visibleSongs.length} pieśni`}
      </div>

      {!loading && visibleSongs.length === 0 && hasFilters && (
        <p className="text-center text-gray-400 py-8">Brak pieśni spełniających filtry</p>
      )}
      {!loading && visibleSongs.length === 0 && !hasFilters && (
        <p className="text-center text-gray-400 py-8">Wybierz tagi, aby zobaczyć pieśni</p>
      )}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-white p-3 flex flex-col gap-2 animate-pulse">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-5 bg-gray-200 rounded-md" />
                  <div className="w-20 h-3 bg-gray-100 rounded-full" />
                </div>
                {serviceId && (
                  <div className="flex gap-1">
                    <div className="w-9 h-9 bg-gray-100 rounded-lg" />
                    <div className="w-9 h-9 bg-gray-200 rounded-lg" />
                  </div>
                )}
              </div>
              <div className={`h-4 bg-gray-200 rounded-full ${i % 3 === 0 ? 'w-3/4' : i % 3 === 1 ? 'w-full' : 'w-2/3'}`} />
            </div>
          ))}
        </div>
      )}

      <div className={`space-y-2 ${loading ? 'hidden' : ''}`}>
        {visibleSongs.map((song) => {
          const existingStatus = serviceStatusMap[song.id]
          // Zaplanowana: blokuj oba przyciski (dodaj przez widok nabożeństwa)
          // Zaśpiewana: blokuj 🔖, pozwól ✅ (można zaśpiewać ponownie)
          const actions = serviceId
            ? [
                existingStatus === 'planned'
                  ? {
                      label: '✕',
                      onClick: (s: Song) => removeFromService(s),
                      variant: 'secondary' as const,
                    }
                  : {
                      label: '🔖',
                      onClick: (s: Song) => addToService(s, 'planned'),
                      variant: 'secondary' as const,
                      disabled: existingStatus === 'sung',
                    },
                {
                  label: '✅',
                  onClick: (s: Song) => addToService(s, 'sung'),
                },
              ]
            : undefined

          return (
            <SongCard
              key={song.id}
              song={song}
              statusBadge={existingStatus}
              actions={actions}
              navSongIds={visibleSongs.map((s) => s.id)}
            />
          )
        })}
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
