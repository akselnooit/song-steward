'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
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

  const listRef = useRef<HTMLUListElement>(null)
  const dragStatusRef = useRef<string | null>(null)

  // Touch drag state — ref so event listener always sees current values
  const touchRef = useRef({
    active: false,
    pendingId: null as string | null,   // id czekające na long press
    draggedId: null as string | null,   // id po aktywacji long press
    startX: 0,
    startY: 0,
    overId: null as string | null,
    timer: null as ReturnType<typeof setTimeout> | null,
  })
  const songsRef = useRef(songs)
  songsRef.current = songs
  const onReorderRef = useRef(onReorder)
  onReorderRef.current = onReorder

  // Non-passive touchmove — zapobiega scrollowi tylko gdy drag aktywny
  useEffect(() => {
    const el = listRef.current
    if (!el) return

    const onTouchMove = (e: TouchEvent) => {
      const tr = touchRef.current
      const touch = e.touches[0]
      const dy = Math.abs(touch.clientY - tr.startY)
      const dx = Math.abs(touch.clientX - tr.startX)

      // Jeśli long press jeszcze nie minął i użytkownik scrolluje — anuluj drag
      if (!tr.active && tr.timer && (dy > 8 || dx > 8)) {
        clearTimeout(tr.timer)
        tr.timer = null
        tr.pendingId = null
        return
      }

      if (!tr.active) return
      e.preventDefault()

      const target = document.elementFromPoint(touch.clientX, touch.clientY)
      const li = target?.closest<HTMLElement>('[data-ss-id]')
      const overId = li?.dataset.ssId ?? null
      tr.overId = overId !== tr.draggedId ? overId : null
      setDragOverId(tr.overId)
    }

    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', onTouchMove)
  }, [])

  if (songs.length === 0) {
    return (
      <p className="text-gray-400 text-sm text-center py-6">
        {status === 'planned' ? 'Brak zaplanowanych pieśni' : 'Brak zaśpiewanych pieśni'}
      </p>
    )
  }

  // ── Touch handlers ────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    const touch = e.touches[0]
    const tr = touchRef.current
    tr.active = false
    tr.pendingId = id
    tr.draggedId = null
    tr.startX = touch.clientX
    tr.startY = touch.clientY
    tr.overId = null
    tr.timer = setTimeout(() => {
      tr.timer = null
      tr.draggedId = id
      tr.active = true
      navigator.vibrate?.(30)
      setDraggedId(id)
    }, 400)
  }

  const handleTouchEnd = () => {
    const tr = touchRef.current
    if (tr.timer) { clearTimeout(tr.timer); tr.timer = null }
    if (tr.active && tr.draggedId && tr.overId) {
      const ids = songsRef.current.map((s) => s.id)
      const fromIdx = ids.indexOf(tr.draggedId)
      const toIdx = ids.indexOf(tr.overId)
      if (fromIdx !== -1 && toIdx !== -1) {
        const reordered = [...ids]
        reordered.splice(fromIdx, 1)
        reordered.splice(toIdx, 0, tr.draggedId)
        onReorderRef.current(reordered)
      }
    }
    tr.active = false
    tr.pendingId = null
    tr.draggedId = null
    tr.overId = null
    setDraggedId(null)
    setDragOverId(null)
  }

  // ── Mouse/desktop drag handlers ───────────────────────────────────
  const handleDragStart = (id: string) => {
    setDraggedId(id)
    dragStatusRef.current = status
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (dragStatusRef.current !== status) return
    setDragOverId(id)
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId || dragStatusRef.current !== status || draggedId === targetId) {
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
    dragStatusRef.current = null
  }

  return (
    <ul ref={listRef} className={status === 'sung' ? 'divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden' : 'space-y-2'}>
      {songs.map((ss, index) => {
        const song = ss.song
        if (!song) return null
        const collectionLabel = song.collection
          ? `${song.collection.short_name} ${song.number}`
          : `#${song.number}`
        const isDragging = draggedId === ss.id
        const isDragOver = dragOverId === ss.id && draggedId !== ss.id

        if (status === 'sung') {
          return (
            <li
              key={ss.id}
              data-ss-id={ss.id}
              draggable
              onDragStart={() => handleDragStart(ss.id)}
              onDragOver={(e) => handleDragOver(e, ss.id)}
              onDrop={(e) => handleDrop(e, ss.id)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(e, ss.id)}
              onTouchEnd={handleTouchEnd}
              className={`px-3 py-2 flex items-center gap-2 cursor-grab active:cursor-grabbing transition-all ${
                isDragging ? 'opacity-40' : ''
              } ${isDragOver ? 'bg-green-100' : 'bg-green-50'}`}
            >
              <span className="shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center select-none">
                {index + 1}
              </span>
              <span className="shrink-0 bg-blue-900 text-white rounded px-1.5 py-0.5 text-xs font-bold">
                {collectionLabel}
              </span>
              <Link
                href={`/songs/${song.id}`}
                className="flex-1 text-sm text-gray-700 leading-tight hover:text-blue-900 line-clamp-1"
                onClick={(e) => e.stopPropagation()}
              >
                {song.title}
              </Link>
              <button
                onClick={() => onDelete(ss.id)}
                className="text-gray-300 hover:text-red-500 hover:scale-110 text-xs px-1 min-h-[36px] transition-all"
                title="Usuń"
              >
                ✕
              </button>
            </li>
          )
        }

        return (
          <li
            key={ss.id}
            data-ss-id={ss.id}
            draggable
            onDragStart={() => handleDragStart(ss.id)}
            onDragOver={(e) => handleDragOver(e, ss.id)}
            onDrop={(e) => handleDrop(e, ss.id)}
            onDragEnd={handleDragEnd}
            onTouchStart={(e) => handleTouchStart(e, ss.id)}
            onTouchEnd={handleTouchEnd}
            className={`bg-white rounded-xl border shadow-sm p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all ${
              isDragging ? 'opacity-40' : ''
            } ${isDragOver ? 'border-blue-400 scale-[1.01]' : 'border-gray-100'}`}
          >
            <span className="shrink-0 text-base select-none">🔖</span>

            <span className="shrink-0 bg-blue-900 text-white rounded-lg px-2 py-0.5 text-xs font-bold">
              {collectionLabel}
            </span>

            <Link
              href={`/songs/${song.id}`}
              className="flex-1 font-medium text-gray-900 text-sm leading-tight hover:text-blue-900"
              onClick={(e) => e.stopPropagation()}
            >
              {song.title}
            </Link>

            <div className="flex gap-1 shrink-0">
              {onConfirm && (
                <button
                  onClick={() => onConfirm(ss.id)}
                  className="bg-white border border-gray-200 text-gray-700 rounded-lg px-3 py-2 text-sm font-medium hover:bg-green-50 hover:border-green-300 min-h-[44px] transition-all active:scale-95"
                  title="Zaśpiewana"
                >
                  ✅
                </button>
              )}
              <button
                onClick={() => onDelete(ss.id)}
                className="bg-gray-100 text-gray-500 rounded-lg px-3 py-2 text-sm hover:bg-red-50 hover:text-red-600 hover:scale-110 min-h-[44px] transition-all active:scale-95"
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
