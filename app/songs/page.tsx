'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import SongCard from '@/components/SongCard'
import { Song, Collection } from '@/lib/types'
import Link from 'next/link'
import { fetcher } from '@/lib/fetcher'
import { cacheGet, cacheSet } from '@/lib/cache'

function SongCardSkeleton({ index }: { index: number }) {
  const widths = ['w-3/4', 'w-full', 'w-2/3']
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 flex flex-col gap-2 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="w-16 h-5 bg-gray-200 rounded-md shrink-0" />
        <div className="w-24 h-3 bg-gray-100 rounded-full" />
      </div>
      <div className={`h-4 bg-gray-200 rounded-full ${widths[index % 3]}`} />
    </div>
  )
}

function SongsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const authorId = searchParams.get('author_id') || ''
  const authorName = searchParams.get('author_name') || ''

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [collectionId, setCollectionId] = useState<string>(() => {
    // Inicjalizuj z cache jeśli dostępny — unika pustego ekranu przy pierwszym wejściu
    if (typeof window === 'undefined') return ''
    const cached = cacheGet<Collection[]>('collections')
    if (cached && !authorId) return cached.find((c) => c.short_name === 'DP')?.id ?? ''
    return ''
  })

  // Debounce wyszukiwania
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Resetuj filtr kolekcji gdy aktywny filtr autora
  useEffect(() => {
    if (authorId) setCollectionId('')
  }, [authorId])

  // Kolekcje: SWR + localStorage (TTL 10 min)
  const { data: collections = [] } = useSWR<Collection[]>('/api/collections', fetcher, {
    fallbackData: cacheGet<Collection[]>('collections') ?? undefined,
    onSuccess: (data) => {
      cacheSet('collections', data)
      // Ustaw domyślną kolekcję DP jeśli nie ma innego filtru
      if (!authorId && !collectionId) {
        setCollectionId(data.find((c) => c.short_name === 'DP')?.id ?? '')
      }
    },
    revalidateOnFocus: false,
  })

  // Klucz API pieśni zależy od filtrów
  const params = new URLSearchParams()
  if (debouncedSearch) params.set('search', debouncedSearch)
  if (collectionId) params.set('collection_id', collectionId)
  if (authorId) params.set('author_id', authorId)
  const songsKey = `/api/songs?${params}`

  // Pieśni: SWR (pamięć) — keepPreviousData = przy zmianie filtra stare wyniki
  // zostają widoczne zamiast migającego "ładowania"
  const { data: songs, isLoading, isValidating } = useSWR<Song[]>(songsKey, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  })

  const clearAuthor = () => router.push('/songs')
  const displaySongs = songs ?? []
  const showSkeleton = isLoading && !songs

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-blue-900">Baza pieśni</h1>
        <span className="text-sm text-gray-500">{displaySongs.length} pieśni</span>
      </div>

      {authorId && authorName && (
        <div className="flex items-center gap-2 mb-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
          <span className="text-sm text-blue-900 font-medium flex-1">Autor: {authorName}</span>
          <button onClick={clearAuthor} className="text-blue-500 hover:text-blue-900 text-sm transition-colors">
            ✕ Wyczyść
          </button>
        </div>
      )}

      <input
        type="search"
        placeholder="Szukaj po tytule, autorze lub numerze..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-900"
      />

      {!authorId && (
        <select
          value={collectionId}
          onChange={(e) => setCollectionId(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
        >
          <option value="">Wszystkie zbiory</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.short_name})
            </option>
          ))}
        </select>
      )}

      {showSkeleton ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <SongCardSkeleton key={i} index={i} />
          ))}
        </div>
      ) : displaySongs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>Brak pieśni</p>
          {(search || collectionId || authorId) && (
            <button
              onClick={() => { setSearch(''); clearAuthor() }}
              className="mt-3 text-blue-900 underline text-sm"
            >
              Wyczyść filtry
            </button>
          )}
        </div>
      ) : (
        // Subtelne przyciemnienie gdy SWR odświeża w tle (zmiana filtra)
        <div className={`space-y-2 transition-opacity duration-200 ${isValidating && !isLoading ? 'opacity-60' : 'opacity-100'}`}>
          {displaySongs.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      )}

      <div className="mt-6 text-center">
        <Link href="/settings" className="text-sm text-gray-400 hover:text-blue-900">
          Zarządzaj zbiorami i pieśniami →
        </Link>
      </div>
    </div>
  )
}

export default function SongsPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">Ładowanie...</div>}>
      <SongsContent />
    </Suspense>
  )
}
