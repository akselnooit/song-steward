'use client'

import { useEffect, useState, useCallback } from 'react'
import SongCard from '@/components/SongCard'
import { Song, Collection } from '@/lib/types'
import Link from 'next/link'

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [search, setSearch] = useState('')
  const [collectionId, setCollectionId] = useState('')
  const [loading, setLoading] = useState(true)

  // Pobierz zbiory
  useEffect(() => {
    fetch('/api/collections')
      .then((r) => r.json())
      .then(setCollections)
  }, [])

  // Pobierz pieśni z filtrowaniem
  const fetchSongs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (collectionId) params.set('collection_id', collectionId)
    const res = await fetch(`/api/songs?${params}`)
    const data = await res.json()
    setSongs(data)
    setLoading(false)
  }, [search, collectionId])

  useEffect(() => {
    // Debounce wyszukiwania
    const timer = setTimeout(fetchSongs, 300)
    return () => clearTimeout(timer)
  }, [fetchSongs])

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-blue-900">Baza pieśni</h1>
        <span className="text-sm text-gray-500">{songs.length} pieśni</span>
      </div>

      {/* Wyszukiwarka */}
      <input
        type="search"
        placeholder="Szukaj po tytule, autorze lub numerze..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-900"
      />

      {/* Filtr zbioru */}
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

      {/* Lista pieśni */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Ładowanie...</div>
      ) : songs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>Brak pieśni</p>
          {(search || collectionId) && (
            <button
              onClick={() => { setSearch(''); setCollectionId('') }}
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

      {/* Link do ustawień - dodawanie pieśni */}
      <div className="mt-6 text-center">
        <Link href="/settings" className="text-sm text-gray-400 hover:text-blue-900">
          Zarządzaj zbiorami i pieśniami →
        </Link>
      </div>
    </div>
  )
}
