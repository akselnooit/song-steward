'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import SongCard from '@/components/SongCard'
import { Song, Collection } from '@/lib/types'
import Link from 'next/link'

// Stałe ID — nie zmieniają się; pozwala zacząć fetchowanie pieśni równolegle z kolekcjami
const DP_COLLECTION_ID = 'd26b6088-f544-4359-bc4c-e14ddc7f2dcb'

function SongsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const authorId = searchParams.get('author_id') || ''
  const authorName = searchParams.get('author_name') || ''

  const [songs, setSongs] = useState<Song[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [search, setSearch] = useState('')
  // Inicjalizujemy od razu z DP — fetchSongs może ruszyć bez czekania na kolekcje
  const [collectionId, setCollectionId] = useState(authorId ? '' : DP_COLLECTION_ID)
  const [loading, setLoading] = useState(true)

  // Pobierz zbiory do dropdownu (równolegle z pierwszym fetchSongs)
  useEffect(() => {
    fetch('/api/collections')
      .then((r) => r.json())
      .then((data: Collection[]) => {
        setCollections(data)
        if (authorId) setCollectionId('')
      })
  }, [authorId])

  const fetchSongs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (collectionId) params.set('collection_id', collectionId)
    if (authorId) params.set('author_id', authorId)
    const res = await fetch(`/api/songs?${params}`)
    const data = await res.json()
    setSongs(data)
    setLoading(false)
  }, [search, collectionId, authorId])

  useEffect(() => {
    const timer = setTimeout(fetchSongs, 300)
    return () => clearTimeout(timer)
  }, [fetchSongs])

  const clearAuthor = () => router.push('/songs')

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-blue-900">Baza pieśni</h1>
        <span className="text-sm text-gray-500">{songs.length} pieśni</span>
      </div>

      {/* Baner aktywnego filtra autora */}
      {authorId && authorName && (
        <div className="flex items-center gap-2 mb-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
          <span className="text-sm text-blue-900 font-medium flex-1">Autor: {authorName}</span>
          <button onClick={clearAuthor} className="text-blue-500 hover:text-blue-900 text-sm">✕ Wyczyść</button>
        </div>
      )}

      {/* Wyszukiwarka */}
      <input
        type="search"
        placeholder="Szukaj po tytule, autorze lub numerze..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-900"
      />

      {/* Filtr zbioru (ukryty gdy aktywny filtr autora) */}
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

      {/* Lista pieśni */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Ładowanie...</div>
      ) : songs.length === 0 ? (
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
        <div className="space-y-2">
          {songs.map((song) => (
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
