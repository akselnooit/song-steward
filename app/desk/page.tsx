'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, RotateCcw } from 'lucide-react'
import { useSongOverlay } from '@/contexts/SongOverlayContext'

type PendingTag = { id: string; name: string }
type PendingSong = {
  id: string
  number: number
  title: string
  collection: { short_name: string } | null
  pending_additions: PendingTag[]
  pending_removals: PendingTag[]
}
type PendingData = {
  totalAdditions: number
  totalRemovals: number
  songs: PendingSong[]
}

export default function DeskPage() {
  const [data, setData] = useState<PendingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null) // klucz "songId:tagId:action"

  const load = () => {
    setLoading(true)
    fetch('/api/pending-tags')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const act = async (songId: string, tagId: string, action: 'confirm_add' | 'confirm_remove' | 'restore') => {
    const key = `${songId}:${tagId}:${action}`
    setSaving(key)
    await fetch('/api/song-tags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ song_id: songId, tag_id: tagId, action }),
    })
    setSaving(null)
    load()
  }

  const confirmAll = async () => {
    if (!data) return
    setSaving('all')
    const actions: Promise<void>[] = []
    for (const song of data.songs) {
      for (const tag of song.pending_additions) {
        actions.push(
          fetch('/api/song-tags', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ song_id: song.id, tag_id: tag.id, action: 'confirm_add' }),
          }).then(() => {})
        )
      }
      for (const tag of song.pending_removals) {
        actions.push(
          fetch('/api/song-tags', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ song_id: song.id, tag_id: tag.id, action: 'confirm_remove' }),
          }).then(() => {})
        )
      }
    }
    await Promise.all(actions)
    setSaving(null)
    load()
  }

  const total = (data?.totalAdditions ?? 0) + (data?.totalRemovals ?? 0)
  const { openSong } = useSongOverlay()

  return (
    <div className="px-6 pt-8 pb-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-blue-900 mb-1">Panel</h1>
      <p className="text-sm text-gray-400 mb-8">Widoczny tylko na komputerze</p>

      {/* Zatwierdzanie tagów */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Zmiany tagów do zatwierdzenia</h2>
          {total > 0 && (
            <button
              onClick={confirmAll}
              disabled={saving !== null}
              className="flex items-center gap-1.5 bg-blue-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-blue-800 active:scale-95 transition-all disabled:opacity-50"
            >
              <CheckCircle size={15} />
              Zatwierdź wszystkie ({total})
            </button>
          )}
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-white rounded-xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && total === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <CheckCircle size={32} className="text-green-400 mx-auto mb-2" />
            <p className="text-gray-500 font-medium">Wszystko zatwierdzone</p>
            <p className="text-sm text-gray-400 mt-1">Brak oczekujących zmian tagów</p>
          </div>
        )}

        {!loading && data && total > 0 && (
          <div className="space-y-3">
            {data.songs.map((song) => {
              const label = song.collection
                ? `${song.collection.short_name} ${song.number}`
                : `#${song.number}`
              return (
                <div key={song.id} className="bg-white rounded-xl border border-gray-100 p-4">
                  <button
                    onClick={() => openSong(song.id)}
                    className="flex items-start gap-2 mb-3 text-left hover:text-blue-900 group w-full"
                  >
                    <span className="bg-blue-900 text-white rounded-lg px-2 py-0.5 text-xs font-bold shrink-0">{label}</span>
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-900 leading-tight">{song.title}</span>
                  </button>

                  {/* Oczekujące dodania */}
                  {song.pending_additions.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide mb-1.5">Dodane</p>
                      <div className="flex flex-wrap gap-2">
                        {song.pending_additions.map((tag) => {
                          const key = `${song.id}:${tag.id}:confirm_add`
                          return (
                            <div key={tag.id} className="flex items-center gap-1">
                              <span className="rounded-full px-3 py-1 text-sm font-medium bg-amber-100 text-amber-700 border border-amber-300">
                                {tag.name}
                              </span>
                              <button
                                onClick={() => act(song.id, tag.id, 'confirm_add')}
                                disabled={saving !== null}
                                title="Zatwierdź dodanie"
                                className="w-7 h-7 flex items-center justify-center rounded-full bg-green-100 text-green-700 hover:bg-green-200 active:scale-95 transition-all disabled:opacity-50 text-sm font-bold"
                              >
                                {saving === key ? '…' : '✓'}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Oczekujące usunięcia */}
                  {song.pending_removals.length > 0 && (
                    <div>
                      <p className="text-xs text-red-500 font-semibold uppercase tracking-wide mb-1.5">Do usunięcia</p>
                      <div className="flex flex-wrap gap-2">
                        {song.pending_removals.map((tag) => {
                          const keyRemove = `${song.id}:${tag.id}:confirm_remove`
                          const keyRestore = `${song.id}:${tag.id}:restore`
                          return (
                            <div key={tag.id} className="flex items-center gap-1">
                              <span className="rounded-full px-3 py-1 text-sm font-medium bg-red-100 text-red-400 border border-red-200 line-through">
                                {tag.name}
                              </span>
                              <button
                                onClick={() => act(song.id, tag.id, 'confirm_remove')}
                                disabled={saving !== null}
                                title="Zatwierdź usunięcie"
                                className="w-7 h-7 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 active:scale-95 transition-all disabled:opacity-50 text-sm font-bold"
                              >
                                {saving === keyRemove ? '…' : '✓'}
                              </button>
                              <button
                                onClick={() => act(song.id, tag.id, 'restore')}
                                disabled={saving !== null}
                                title="Przywróć tag"
                                className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-50 text-sm"
                              >
                                {saving === keyRestore ? '…' : <RotateCcw size={13} />}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
