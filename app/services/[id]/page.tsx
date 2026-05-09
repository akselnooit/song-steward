'use client'

import { useEffect, useState, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ServiceSongList from '@/components/ServiceSongList'
import { ServiceSong, Song } from '@/lib/types'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

interface ServiceDetail {
  id: string
  date: string
  notes: string | null
  service_type?: { name: string }
  worship_leader?: { name: string }
  service_songs: ServiceSong[]
}

export default function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [service, setService] = useState<ServiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [notesEditing, setNotesEditing] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [songSearch, setSongSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Song[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [addingStatus, setAddingStatus] = useState<'planned' | 'sung' | null>(null)

  const fetchService = useCallback(async () => {
    const res = await fetch(`/api/services/${id}`)
    const data = await res.json()
    setService(data)
    setNotes(data.notes || '')
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchService()
  }, [fetchService])

  // Wyszukiwanie pieśni do dodania
  useEffect(() => {
    if (!songSearch.trim()) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true)
      const res = await fetch(`/api/songs?search=${encodeURIComponent(songSearch)}`)
      const data = await res.json()
      setSearchResults(data.slice(0, 8))
      setSearchLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [songSearch])

  const addSong = async (songId: string, status: 'planned' | 'sung') => {
    setAddingStatus(status)
    await fetch('/api/service-songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_id: id, song_id: songId, status }),
    })
    setSongSearch('')
    setSearchResults([])
    await fetchService()
    setAddingStatus(null)
  }

  const confirmSong = async (serviceSongId: string) => {
    // Policz ile jest już zaśpiewanych, aby nadać kolejność
    const sungCount = service?.service_songs.filter((ss) => ss.status === 'sung').length || 0
    await fetch(`/api/service-songs/${serviceSongId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sung', song_order: sungCount + 1 }),
    })
    await fetchService()
  }

  const deleteSong = async (serviceSongId: string) => {
    await fetch(`/api/service-songs/${serviceSongId}`, { method: 'DELETE' })
    await fetchService()
  }

  const saveNotes = async () => {
    setNotesEditing(false)
    await fetch(`/api/services/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: notes || null }),
    })
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  const reorderSongs = async (orderedIds: string[]) => {
    await Promise.all(
      orderedIds.map((ssId, index) =>
        fetch(`/api/service-songs/${ssId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ song_order: index + 1 }),
        })
      )
    )
    await fetchService()
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Ładowanie...</div>
  if (!service) return <div className="text-center py-20 text-gray-400">Nie znaleziono nabożeństwa</div>

  const plannedSongs = service.service_songs.filter((ss) => ss.status === 'planned')
  const sungSongs = service.service_songs
    .filter((ss) => ss.status === 'sung')
    .sort((a, b) => (a.song_order || 0) - (b.song_order || 0))

  // Mapa songId → status już w nabożeństwie
  const addedSongStatus = new Map(service.service_songs.map((ss) => [ss.song_id, ss.status]))

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <Link href="/services?all=1" className="text-sm text-blue-900 mb-3 inline-block">← Nabożeństwa</Link>

      {/* Nagłówek */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-5">
        <h1 className="font-bold text-gray-900 text-lg">
          {new Date(service.date).toLocaleDateString('pl-PL', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {service.service_type?.name || '—'}
          {service.worship_leader?.name && (
            <span className="ml-2 text-gray-400">· {service.worship_leader.name}</span>
          )}
        </p>
        <div className="mt-2">
          {notesEditing ? (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              onKeyDown={(e) => { if (e.key === 'Escape') saveNotes() }}
              autoFocus
              rows={6}
              className="w-full text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          ) : (
            <button
              onClick={() => setNotesEditing(true)}
              className="w-full text-left flex items-start justify-between gap-2 group"
            >
              <span className={`text-sm leading-relaxed ${notes ? 'text-gray-600' : 'text-gray-300'}`}>
                {notes || 'Dodaj notatkę…'}
              </span>
              <span className="shrink-0 text-gray-300 group-hover:text-gray-400 group-hover:rotate-[-15deg] text-xs mt-0.5 transition-all">✎</span>
            </button>
          )}
          {notesSaved && !notesEditing && (
            <span className="text-xs text-green-500 mt-1 block">Zapisano</span>
          )}
        </div>
      </div>

      {/* Dodawanie pieśni */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-5">
        <p className="text-sm font-semibold text-gray-700 mb-2">Dodaj pieśń</p>
        <div className="relative">
          <input
            type="search"
            placeholder="Szukaj po tytule lub numerze..."
            value={songSearch}
            onChange={(e) => setSongSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
          />
          {searchLoading && (
            <Loader2 size={16} className="absolute right-4 top-3.5 text-gray-400 animate-spin" />
          )}
        </div>

        {/* Wyniki wyszukiwania */}
        {searchResults.length > 0 && (
          <ul className="mt-2 border border-gray-100 rounded-xl overflow-hidden animate-fade-in">
            {searchResults.map((song) => {
              const existingStatus = addedSongStatus.get(song.id)
              const collectionLabel = song.collection
                ? `${song.collection.short_name} ${song.number}`
                : `#${song.number}`
              return (
                <li key={song.id} className={`border-b border-gray-50 last:border-0 ${
                  existingStatus === 'sung' ? 'bg-green-50' :
                  existingStatus === 'planned' ? 'bg-blue-50' : ''
                }`}>
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <span className="text-xs font-bold text-gray-400 shrink-0">{collectionLabel}</span>
                    <span className="flex-1 text-sm text-gray-900 line-clamp-1">{song.title}</span>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => addSong(song.id, 'planned')}
                        disabled={!!addingStatus || existingStatus === 'planned'}
                        className={`text-xs rounded-lg px-2 py-1.5 min-h-[36px] transition-all ${
                          existingStatus === 'planned'
                            ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95'
                        }`}
                        title="Zaplanuj"
                      >
                        🔖
                      </button>
                      <button
                        onClick={() => addSong(song.id, 'sung')}
                        disabled={!!addingStatus}
                        className="text-xs bg-blue-900 text-white rounded-lg px-2 py-1.5 hover:bg-blue-800 min-h-[36px] active:scale-95 transition-all"
                        title="Zaśpiewana"
                      >
                        ✅
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {/* Szukaj po tagach */}
        <Link
          href={`/search?service_id=${id}`}
          className="mt-3 w-full flex items-center justify-center gap-2 border border-blue-900 text-blue-900 rounded-xl py-2.5 text-sm font-medium hover:bg-blue-50 active:scale-[0.98] transition-all"
        >
          🔖 Szukaj po tagach
        </Link>
      </div>

      {/* Sekcja A: Zaplanowane */}
      <div className="mb-5">
        <h2 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
          🔖 Zaplanowane ({plannedSongs.length})
        </h2>
        <ServiceSongList
          songs={plannedSongs}
          status="planned"
          onConfirm={confirmSong}
          onDelete={deleteSong}
          onReorder={reorderSongs}
        />
      </div>

      {/* Sekcja B: Zaśpiewane */}
      <div>
        <h2 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
          ✅ Zaśpiewane ({sungSongs.length})
        </h2>
        <ServiceSongList
          songs={sungSongs}
          status="sung"
          onDelete={deleteSong}
          onReorder={reorderSongs}
        />
      </div>

      {/* Usuń nabożeństwo */}
      <div className="mt-8 pt-4 border-t border-gray-100 text-center">
        <button
          onClick={async () => {
            if (!confirm('Na pewno usunąć to nabożeństwo?')) return
            await fetch(`/api/services/${id}`, { method: 'DELETE' })
            router.push('/services')
          }}
          className="text-sm text-red-400 hover:text-red-600 hover:scale-105 transition-all"
        >
          Usuń nabożeństwo
        </button>
      </div>
    </div>
  )
}
