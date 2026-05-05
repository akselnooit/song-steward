'use client'

import { ServiceSong } from '@/lib/types'

interface Props {
  songs: ServiceSong[]
  status: 'planned' | 'sung'
  onConfirm?: (serviceSongId: string) => void
  onDelete: (serviceSongId: string) => void
}

export default function ServiceSongList({ songs, status, onConfirm, onDelete }: Props) {
  if (songs.length === 0) {
    return (
      <p className="text-gray-400 text-sm text-center py-6">
        {status === 'planned' ? 'Brak zaplanowanych pieśni' : 'Brak zaśpiewanych pieśni'}
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {songs.map((ss, index) => {
        const song = ss.song
        if (!song) return null
        const collectionLabel = song.collection
          ? `${song.collection.short_name} ${song.number}`
          : `#${song.number}`

        return (
          <li
            key={ss.id}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center gap-3"
          >
            {/* Numer kolejności (tylko dla sung) */}
            {status === 'sung' && (
              <span className="shrink-0 w-7 h-7 rounded-full bg-green-100 text-green-700 text-sm font-bold flex items-center justify-center">
                {index + 1}
              </span>
            )}

            {/* Numer ze zbioru */}
            <span className="shrink-0 bg-blue-900 text-white rounded-lg px-2 py-0.5 text-xs font-bold">
              {collectionLabel}
            </span>

            {/* Tytuł */}
            <span className="flex-1 font-medium text-gray-900 text-sm leading-tight">
              {song.title}
            </span>

            {/* Przyciski */}
            <div className="flex gap-1 shrink-0">
              {status === 'planned' && onConfirm && (
                <button
                  onClick={() => onConfirm(ss.id)}
                  className="bg-green-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-green-700 min-h-[44px]"
                  title="Zaśpiewana"
                >
                  ✓
                </button>
              )}
              <button
                onClick={() => onDelete(ss.id)}
                className="bg-gray-100 text-gray-500 rounded-lg px-3 py-2 text-sm hover:bg-red-50 hover:text-red-600 min-h-[44px]"
                title="Usuń"
              >
                ✕
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
