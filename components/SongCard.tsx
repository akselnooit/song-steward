'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Song } from '@/lib/types'
import { useSongOverlay, ServiceCtx } from '@/contexts/SongOverlayContext'

interface Action {
  label: string
  onClick: (song: Song) => void
  variant?: 'primary' | 'secondary'
  disabled?: boolean
}

interface Props {
  song: Song
  actions?: Action[]
  statusBadge?: 'planned' | 'sung'
  navSongIds?: string[]
  serviceCtx?: ServiceCtx
}

export default function SongCard({ song, actions, statusBadge, navSongIds, serviceCtx }: Props) {
  const [lightbox, setLightbox] = useState(false)
  const { openSong } = useSongOverlay()

  const collectionLabel = song.collection
    ? `${song.collection.short_name} ${song.number}`
    : `#${song.number}`

  return (
    <>
      <div className={`rounded-xl shadow-sm border p-3 flex flex-col gap-1.5 ${
        statusBadge === 'sung'    ? 'bg-green-50 border-green-100' :
        statusBadge === 'planned' ? 'bg-blue-50 border-blue-100'   :
        'bg-white border-gray-100'
      }`}>
          {/* Pierwszy wiersz: badge + autor po lewej, przyciski po prawej */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="shrink-0 bg-blue-900 text-white rounded-md px-2 py-0.5 text-xs font-bold">
              {collectionLabel}
            </span>
            {song.author_image && (
              <button onClick={() => setLightbox(true)} className="shrink-0 focus:outline-none" aria-label="Pokaż zdjęcie autora">
                <img src={song.author_image} alt={song.author || ''} className="w-4 h-4 rounded-full object-cover hover:opacity-80 transition-opacity" />
              </button>
            )}
            {song.author && (
              <Link
                href={`/songs?author_id=${song.author_id}&author_name=${encodeURIComponent(song.author)}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-gray-400 hover:text-blue-900 truncate"
              >
                {song.author}
              </Link>
            )}
            {song.tags && song.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {song.tags.map((tag) => (
                  <span key={tag.id} className="inline-block bg-blue-50 text-blue-800 text-xs rounded-full px-2 py-0.5">
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {actions && actions.length > 0 && (
            <div className="flex gap-1 shrink-0">
              {actions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => !action.disabled && action.onClick(song)}
                  disabled={action.disabled}
                  className={`rounded-lg px-2.5 py-1.5 text-sm font-medium min-h-[36px] transition-all ${
                    action.disabled
                      ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                      : action.variant === 'secondary'
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95'
                      : 'bg-blue-900 text-white hover:bg-blue-800 active:bg-blue-700 active:scale-95'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tytuł — pełna szerokość na dole */}
        <button
          className="font-semibold text-gray-900 hover:text-blue-900 leading-snug text-left"
          onClick={() => openSong(song.id, navSongIds ?? [], serviceCtx ?? null, statusBadge ?? null)}
        >
          {song.title}
        </button>
      </div>

      {lightbox && song.author_image && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setLightbox(false)}>
          <img src={song.author_image} alt={song.author || ''} className="max-w-[90vw] max-h-[90vh] rounded-2xl object-contain shadow-2xl" />
        </div>
      )}
    </>
  )
}
