'use client'

import { useState, useRef } from 'react'
import { ServiceSong } from '@/lib/types'

interface Props {
  songs: ServiceSong[]
  status: 'planned' | 'sung'
  onConfirm?: (serviceSongId: string) => void
  onDelete: (serviceSongId: string) => void
  onReorder: (orderedIds: string[]) => void
}

export default function ServiceSongList({ songs, status, onConfirm, onDelete, onReorder }: Props) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const dragStatus = useRef<string | null>(null)

  if (songs.length === 0) {
    return (
      <p className="text-gray-400 text-sm text-center py-6">
        {status === 'planned' ? 'Brak zaplanowanych pieśni' : 'Brak zaśpiewanych pieśni'}
      </p>
    )
  }

  const handleDragStart = (id: string) => {
    setDraggedId(id)
    dragStatus.current = status
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (dragStatus.current !== status) return
    setDragOverId(id)
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId || dragStatus.current !== status || draggedId === targetId) {
      setDraggedId(null)
      setDragOverId(null)
      return
    }
    const ids = songs.map((s) => s.id)
    const fromIdx = ids.indexOf(draggedId)
    const toIdx = ids.indexOf(targetId)
    const reordered = [...ids]
    reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, draggedId)
    onReorder(reordered)
    setDraggedId(null)
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
    dragStatus.current = null
  }

  return (
    <ul className="space-y-2">
      {songs.map((ss, index) => {
        const song = ss.song
        if (!song) return null
        const collectionLabel = song.collection
          ? `${song.collection.short_name} ${song.number}`
          : `#${song.number}`
        const isDragging = draggedId === ss.id
        const isDragOver = dragOverId === ss.id && draggedId !== ss.id

        return (
          <li
            key={ss.id}
            draggable
            onDragStart={() => handleDragStart(ss.id)}
            onDragOver={(e) => handleDragOver(e, ss.id)}
            onDrop={(e) => handleDrop(e, ss.id)}
            onDragEnd={handleDragEnd}
            className={`bg-white rounded-xl border shadow-sm p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all ${
              isDragging ? 'opacity-40' : ''
            } ${isDragOver ? 'border-blue-400 scale-[1.01]' : 'border-gray-100'}`}
          >
            {/* Ikona statusu */}
            {status === 'sung' ? (
              <span className="shrink-0 w-7 h-7 rounded-full bg-green-100 text-green-700 text-sm font-bold flex items-center justify-center select-none">
                {index + 1}
              </span>
            ) : (
              <span className="shrink-0 text-base select-none">🔖</span>
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
                  className="bg-white border border-gray-200 text-gray-700 rounded-lg px-3 py-2 text-sm font-medium hover:bg-green-50 hover:border-green-300 min-h-[44px]"
                  title="Zaśpiewana"
                >
                  ✅
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
