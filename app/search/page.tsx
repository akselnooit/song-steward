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
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>(() => searchParams.getAll('author'))
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

  // Autorzy: SWR + localStorage (TTL 5 min)
  const { data: allAuthors = [] } = useSWR<string[]>('/api/authors', fetcher, {
    fallbackData: cacheGet('/api/authors') ?? undefined,
    onSuccess: (data) => cacheSet('/api/authors', data),
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60 * 1000,
  })

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

  // Pieśni: SWR (pamięć) z keepPreviousData — lista nie znika przy zmianie tagów/autorów
  const songParams = new URLSearchParams()
  selectedTagIds.forEach((id) => songParams.append('tag_id', id))
  selectedAuthors.forEach((a) => songParams.append('author', a))
  const { data: songs = [], isLoading: loading } = useSWR<Song[]>(
    `/api/songs?${songParams}`,
    fetcher,
    { keepPreviousData: true, revalidateOnFocus: false }
  )

  const updateUrl = (selected: string[], excluded: string[], authors: string[]) => {
    const params = new URLSearchParams()
    if (serviceIdParam) params.set('service_id', serviceIdParam)
    selected.forEach((id) => params.append('tag', id))
    excluded.forEach((id) => params.append('excl', id))
    authors.forEach((a) => params.append('author', a))
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
    updateUrl(newSelected, newExcluded, selectedAuthors)
  }

  const toggleExclude = (tagId: string) => {
    const newSelected = selectedTagIds.filter((id) => id !== tagId)
    const newExcluded = excludedTagIds.includes(tagId)
      ? excludedTagIds.filter((id) => id !== tagId)
      : [...excludedTagIds, tagId]
    setSelectedTagIds(newSelected)
    setExcludedTagIds(newExcluded)
    updateUrl(newSelected, newExcluded, selectedAuthors)
  }

  const toggleAuthor = (author: string) => {
    const newAuthors = selectedAuthors.includes(author)
      ? selectedAuthors.filter((a) => a !== author)
      : [...selectedAuthors, author]
    setSelectedAuthors(newAuthors)
    updateUrl(selectedTagIds, excludedTagIds, newAuthors)
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

  const hasFilters = selectedTagIds.length > 0 || excludedTagIds.length > 0 || selectedAuthors.length > 0

  const hasActiveFilters = selectedTagIds.length > 0 || excludedTagIds.length > 0 || selectedAuthors.length > 0
  const clearFilters = () => { setSelectedTagIds([]); setExcludedTagIds([]); setSelectedAuthors([]); updateUrl([], [], []) }

  return (
    <div className="px-4 pt-0 pb-4 max-w-lg mx-auto">
      {/* Sticky header: tytuł + nabożeństwo + tylko aktywne filtry */}
      <div className="sticky top-0 z-10 -mx-4 px-4 pt-4 pb-3 bg-white border-b border-gray-100 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-base font-bold text-blue-900">Szukaj po tagach</h1>
          {serviceIdParam && (
            <button onClick={() => router.push(`/services/${serviceIdParam}`)} className="text-sm text-blue-900">
              ← Nabożeństwo
            </button>
          )}
        </div>
        {serviceId && serviceName && (
          <p className="text-xs text-blue-800 bg-blue-50 px-2.5 py-1.5 rounded-lg mb-2 inline-block">
            Dodajesz do: <span className="font-semibold">{serviceName}</span>
          </p>
        )}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-blue-700 font-semibold shrink-0">Filtry:</span>
            {selectedTagIds.map((tagId) => {
              const tag = allTags.find((t) => t.id === tagId)
              if (!tag) return null
              return (
                <button key={tagId} onClick={() => toggleTag(tagId)}
                  className="bg-blue-900 text-white rounded-full px-2.5 py-1 text-xs font-medium flex items-center gap-1 active:scale-95 transition-all">
                  {tag.name} <span className="opacity-70">✕</span>
                </button>
              )
            })}
            {excludedTagIds.map((tagId) => {
              const tag = allTags.find((t) => t.id === tagId)
              if (!tag) return null
              return (
                <button key={`excl-${tagId}`} onClick={() => toggleExclude(tagId)}
                  className="bg-red-100 text-red-600 rounded-full px-2.5 py-1 text-xs font-medium flex items-center gap-1 line-through active:scale-95 transition-all">
                  {tag.name} <span className="opacity-70 no-underline" style={{ textDecoration: 'none' }}>✕</span>
                </button>
              )
            })}
            {selectedAuthors.map((author) => (
              <button key={`author-${author}`} onClick={() => toggleAuthor(author)}
                className="bg-amber-600 text-white rounded-full px-2.5 py-1 text-xs font-medium flex items-center gap-1 active:scale-95 transition-all">
                {author} <span className="opacity-70">✕</span>
              </button>
            ))}
            <button onClick={clearFilters} className="text-xs text-blue-700 underline ml-auto shrink-0">
              Wyczyść
            </button>
          </div>
        )}
      </div>

      {/* Pełny panel tagów do wyboru (nie-sticky) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <TagFilter
          availableTags={displayTags}
          selectedTagIds={selectedTagIds}
          excludedTagIds={excludedTagIds}
          onToggleTag={toggleTag}
          onToggleExclude={toggleExclude}
          onClear={clearFilters}
          categories={categories}
          hideActiveFilters={hasActiveFilters}
          authors={allAuthors}
          selectedAuthors={selectedAuthors}
          onToggleAuthor={toggleAuthor}
        />
      </div>

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
              serviceCtx={serviceId && serviceName ? { serviceId, serviceName } : undefined}
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
